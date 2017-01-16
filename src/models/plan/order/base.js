import _ from 'underscore';
import Promise from 'bluebird';
import crypto from 'crypto';
import moment from 'moment';
import config from 'config';

import { ApiError } from 'lib/error';
import { indexObjectId } from 'lib/utils';
import C from 'lib/constants';
import db from 'lib/database';
import Coupon from '../coupon';
import Product from '../product';
import Discount from '../discount';
import CompanyLevel from 'models/company-level';

export let randomBytes = Promise.promisify(crypto.randomBytes);

const ORDER_EXPIRE_MINUTES = config.get('order.expire_minutes');

export default class BaseOrder {

  constructor(props) {
    if (!props
      || !_.has(props, 'user_id')
      || !_.has(props, 'company_id')
      || !_.has(props, 'planStatus')) {
      throw new Error('invalid params');
    }
    let { user_id, company_id, planStatus } = props;
    this._planStatus = planStatus;
    this.user_id = user_id;
    this.company_id = company_id;
    this.order_type = null;
    this.products = [];
    this.times = 0;
    this.original_sum = 0;
    this.paid_sum = 0;
    this.coupon = undefined;
    this.status = C.ORDER_STATUS.CREATED;
    this.original_plan = undefined;
    this.date_create = new Date();
    this.date_update = new Date();
    this.date_expires = moment().subtract(ORDER_EXPIRE_MINUTES, 'minute').toDate();
    this.member_count = 0;
  }

  init() {
    return Promise.reject(new Error('please override init method'));
  }

  isValid() {
    return Promise.reject(new Error('please override isValid method'));
  }

  save() {
    return Promise.all([
      this.ensureNotDegradeProcessing(),
      this.ensureHasNotPendingOrder(),
    ])
    .then(() => this.prepare())
    .then(({order, isValid, error}) => {
      if (!isValid) {
        throw new ApiError(400, error);
      }
      return this.createOrderNo()
      .then(order_no => {
        order.order_no = order_no;
        return Promise.all([
          db.payment.order.insert(order),
          this.updateUsedCoupon(),
        ]);
      })
      .then(doc => doc[0]);
    });
  }

  prepare() {
    return this.isValid()
    .then(({error, isValid}) => {
      if (!isValid) {
        return {
          isValid,
          error: error && error.join(','),
          limits: this.limits,
        };
      }
      this.paid_sum = this.original_sum = this.getOriginalFeeOfProducts();
      this.initProducts();
      return this.getDiscount().then(() => {
        this.products.forEach(product => {
          delete product.discount;
        });
        return {
          isValid,
          limits: this.limits,
          order: {
            user_id: this.user_id,
            company_id: this.company_id,
            plan: this.plan,
            original_plan: this.original_plan,
            order_type: this.order_type,
            products: this.products,
            member_count: this.member_count,
            times: this.times,
            original_times: this.original_times,
            original_sum: this.original_sum,
            paid_sum: Math.round(this.paid_sum),
            coupon: this.coupon,
            discount: this.discount,
            status: this.status,
            date_create: this.date_create,
            date_update: this.date_update,
            date_expires: this.date_expires,
          },
        };
      });
    });
  }

  setTimes(times) {
    this.times = this.original_times = times;
  }

  withCoupon(coupon) {
    this.coupon = coupon;
  }

  updateUsedCoupon() {
    return db.payment.company.coupon.update({
      _id: this.company_id,
      'list.coupon_no': this.coupon,
    }, {
      $set: {
        'list.$.status': C.COMPANY_COUPON_STATUS.USED,
      }
    });
  }

  getCoupons() {
    return new Coupon(this.company_id).getCoupons(this.order_type)
    .then(coupons => {
      coupons.forEach(coupon => {
        coupon.isAvailable = this.isCouponAvailable(coupon);
      });
      return coupons;
    });
  }

  isCouponAvailable(coupon) {
    let { products } = coupon;
    let result = false;
    if (products === null) {
      result = !!this._getOrderDiscount(coupon);
    } else {
      products.forEach(product_id => {
        let product = _.find(this.products, item => item._id.equals(product_id));
        if (product) {
          result = result || !!this._getProductDiscount(product, coupon);
        }
      });
    }
    return result;
  }

  getDiscount() {
    return this.getProductsDiscount()
    .then(() => this.getCouponDiscount());
  }

  initProducts() {
    this.products.forEach(product => {
      product.paid_sum = product.sum = Math.round(this.times * product.quantity * product.original_price);
    });
  }

  getOriginalFeeOfProducts() {
    return Math.round(_.reduce(this.products.map(product => product.quantity * product.original_price * this.times), (memo, num) => memo + num, 0));
  }

  getCouponDiscount() {
    if (!this.coupon) {
      return Promise.resolve();
    }
    return new Coupon(this.company_id).getCoupon(this.coupon).then(coupon => {
      if (!coupon || !this.isCouponAvailable(coupon)) {
        this.coupon = undefined;
        return;
      }
      let { products } = coupon;
      if (coupon.products === null || coupon.products.length == 2) {
        this._persistOrderDiscount({coupon: coupon._id}, this._getOrderDiscount(coupon));
      } else {
        _.filter(this.products, product => indexObjectId(products, product._id) > -1).map(product => {
          let discountProduct = this._getProductDiscount(product, coupon);
          this._persistProductDiscount({coupon: coupon._id}, discountProduct, product._id);
        });
      }
    });
  }

  getProductsDiscount() {
    return Promise.map(this.products, product => {
      let { discount, quantity, sum } = product;
      if (!discount || !discount.length) {
        return;
      }
      delete product.discounts;
      return Discount.getProductDiscount(this.order_type, discount, {quantity, total_fee: sum, times: this.times})
      .then(discountItem => {
        if (!discountItem) {
          return;
        }
        let discountInfo = this._getProductDiscount(product, discountItem);
        this._persistProductDiscount({product_discount: discountItem._id}, discountInfo, product._id);
      });
    });
  }

  _persistProductDiscount(ext, discountInfo, productId) {
    if (!discountInfo) {
      return;
    }
    _.extend(discountInfo, ext);
    let { type } = discountInfo;
    let product = _.find(this.products, product => product._id.equals(productId));
    switch (type) {
    case 'amount':
    case 'rate':
      discountInfo.fee = Math.round(discountInfo.fee);
      product.paid_sum -= discountInfo.fee;
      this.paid_sum -= discountInfo.fee;
      break;
    case 'number':
      product.quantity += discountInfo.number;
      this.member_count += discountInfo.number;
      break;
    case 'times':
      this.times += discountInfo.times;
      break;
    }
    // product.discount_using = (product.discount_using || []).concat(discountInfo);
    this.discount = (this.discount || []).concat(_.extend({}, {product: product.product_no}, discountInfo));
  }

  _persistOrderDiscount(ext, discountInfo) {
    if (!discountInfo) {
      return;
    }
    _.extend(discountInfo, ext);
    let { type } = discountInfo;
    switch (type) {
    case 'amount':
    case 'rate':
      discountInfo.fee = Math.round(discountInfo.fee);
      this.paid_sum -= discountInfo.fee;
      break;
    case 'times':
      this.times += discountInfo.times;
      break;
    }
    this.discount = (this.discount || []).concat(discountInfo);
  }

  _getProductDiscount(product, discountItem) {
    let { quantity, sum } = product;
    let { times } = this;
    let origin = {quantity, total_fee: sum, times};
    return Discount.getDiscount(origin, discountItem);
  }

  _getOrderDiscount(discountItem) {
    let origin = {
      total_fee: this.paid_sum,
      times: this.times
    };
    return Discount.getDiscount(origin, discountItem);
  }

  getPlanStatus() {
    return this._planStatus;
  }

  ensureNotDegradeProcessing() {
    let {degrade} = this.getPlanStatus();
    if (degrade) {
      return Promise.reject(new ApiError(400, 'exit_plan_degrade'));
    }
    Promise.resolve();
  }

  ensureHasNotPendingOrder() {
    return db.payment.order.count({
      company_id: this.company_id,
      status: {$in: [C.ORDER_STATUS.CREATED, C.ORDER_STATUS.PAYING]},
      date_expires: {$lt: new Date()}
    })
    .then(pendingCount => {
      if (pendingCount) {
        throw new ApiError(400, 'exist_pending_order');
      }
    });
  }

  getCompanyLevelStatus() {
    let {companyLevelStatus, company_id} = this;
    if (companyLevelStatus) {
      return Promise.resolve(companyLevelStatus);
    }
    return new CompanyLevel(company_id).getStatus().then(companyLevelStatus => {
      this.companyLevelStatus = companyLevelStatus;
      return companyLevelStatus;
    });
  }

  createOrderNo() {
    return randomBytes(2)
    .then(buffer => {
      let randomStr = (parseInt(buffer.toString('hex'), 16)).toString().substr(0, 4);
      return 'T' + moment().format('YYYYMMDDHHmmssSSS') + randomStr;
    });
  }

  getProducts(plan) {
    return Product.getByPlan(plan);
  }

}
