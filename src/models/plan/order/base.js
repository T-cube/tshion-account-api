import _ from 'underscore';
import Promise from 'bluebird';

import { ApiError } from 'lib/error';
import C from 'lib/constants';
import db from 'lib/database';
import Coupon from '../coupon';
import Product from '../product';
import Discount from '../discount';
import Plan from '../plan';
import PaymentDiscount from '../payment-discount';
import ProductDiscount from '../product-discount';
import CompanyLevel from 'models/company-level';


export default class BaseOrder {

  constructor(props) {
    let { user_id, company_id } = props;
    if (!user_id) {
      throw new Error('invalid user_id');
    }
    if (!company_id) {
      throw new Error('invalid company_id');
    }
    this.user_id = user_id;
    this.company_id = company_id;
    this.order_type = null;
    this.products = [];
    this.times = 0;
    this.original_sum = 0;
    this.paid_sum = 0;
    this.coupon = undefined;
    this.status = undefined;
    this.original_plan = undefined;
    this.date_create = new Date();
    this.date_update = new Date();
    this.member_count = 0;
  }

  init({plan, member_count, coupon, times}) {
    if (coupon) {
      this.withCoupon(coupon);
    }
    if (times) {
      this.setTimes(times);
    }
    this.member_count = member_count || 0;
    let getPlan = plan
      ? Promise.resolve(plan)
      : this.getPlanStatus().then(({current}) => {
        if (current && C.TEAMPLAN.FREE != current.plan && current.type != 'trial') {
          return current.plan;
        }
      });
    return getPlan.then(plan => {
      if (!plan) {
        return;
      }
      this.plan = plan;
      return Product.getByPlan(plan).then(planProducts => {
        let products = [];
        planProducts.forEach(product => {
          if (product.product_no == 'P0002') {
            product.quantity = member_count || 0;
          } else if (product.product_no == 'P0001') {
            product.quantity = 1;
          }
          product.sum = product.original_price * product.quantity;
          products.push(product);
        });
        this.products = products;
      });
    });
  }

  setTimes(times) {
    this.times = times;
  }

  withCoupon(coupon) {
    this.coupon = coupon;
  }

  updateUsedCoupon() {
    this.coupon; // TODO
  }

  save() {
    return BaseOrder.getPendingOrder()
    .then(orderPending => {
      if (orderPending) {
        throw new ApiError(400, 'exist_pending_order');
      }
      return this.prepare().then(({order, isValid, error}) => {
        if (!isValid) {
          throw new ApiError(400, error);
        }
        order.status = 'created';
        return Promise.all([
          this.updateUsedCoupon(),
          db.payment.order.insert(order)
        ]);
      });
    })
    .then(doc => doc[1]);
  }

  prepare() {
    return this.isValid().then(({error, isValid}) => {
      if (!isValid) {
        return {
          isValid,
          error: error && error.join(','),
          limits: this.limits,
        };
      }
      this.paid_sum = this.original_sum = this.getOriginalFeeOfProducts();
      this.initProducts();
      return this.getDiscount().then(() => ({
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
          original_sum: this.original_sum,
          paid_sum: Math.round(this.paid_sum),
          coupon: this.coupon,
          discount: this.discount,
          status: this.status,
          date_create: this.date_create,
          date_update: this.date_update,
        },
      }));
    });
  }

  isValid() {
    return Promise.resolve({});
  }

  static getPendingOrder(company_id) {
    return db.payment.order.findOne({
      company_id: company_id,
      status: {$in: ['created', 'paying']}
    });
  }

  getCoupons() {
    return new Coupon(this.company_id).getCoupons()
    .then(coupons => {
      coupons.forEach(coupon => {
        coupon.isAvailable = this.isCouponAvailable(coupon);
      });
      return coupons;
    });
  }

  // TODO
  isCouponAvailable(coupon) {
    let { products } = coupon;
    let result = false;
    if (products === null) {
      result = !!this._getOrderDiscount(coupon);
    } else {
      products.forEach(product_no => {
        let product = _.find(this.products, item => item.product_no == product_no);
        if (product) {
          result = result || !!this._getProductDiscount(product, coupon);
        }
      });
    }
    return result;
  }

  getDiscount() {
    return this.getProductsDiscount()
    .then(() => this.getCouponDiscount())
    .then(() => this.getPayDiscount());
  }

  initProducts() {
    this.products.forEach(product => {
      product.paid_sum = product.sum = this.times * product.quantity * product.original_price;
    });
  }

  getOriginalFeeOfProducts() {
    return _.reduce(this.products.map(product => product.quantity * product.original_price * this.times), (memo, num) => memo + num, 0);
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
      if (coupon.products === null) {
        this._persistOrderDiscount({coupon: coupon._id}, this._getOrderDiscount(coupon));
      } else {
        _.filter(this.products, item => _.contains(products, item.product_no)).map(product => {
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
      delete product.discount;
      return db.payment.product.discount.find({
        _id: {
          $in: discount
        },
        'period.date_start': {$lte: new Date()},
        'period.date_end': {$gte: new Date()},
        $or: [
          {
            'criteria.quantity': {$lte: quantity}
          },
          {
            'criteria.total_fee': {$lte: sum}
          }
        ]
      })
      .sort({
        'criteria.quantity': 1,
        'criteria.total_fee': 1,
      })
      .limit(1)
      .then(doc => {
        if (!doc.length) {
          return null;
        }
        let discountItem = doc[0];
        let discountInfo = this._getProductDiscount(product, discountItem);
        this._persistProductDiscount({product_discount: discountItem._id}, discountInfo, product._id);
      });
    });
  }

  getPayDiscount() {
    return PaymentDiscount.getDiscount(this.paid_sum)
    .then(payDiscount => {
      if (_.isNumber(payDiscount)) {
        this.discount = (this.discount || []).concat({
          pay_discount: 1,
          fee: payDiscount
        });
        this.paid_sum -= payDiscount;
      }
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
      break;
    }
    product.discount = (product.discount || []).concat(discountInfo);
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
    let origin = {quantity, total_fee: sum};
    return Discount.getDiscount(origin, discountItem);
  }

  _getOrderDiscount(discountItem) {
    let origin = {
      total_fee: this.paid_sum,
      times: this.times
    };
    return Discount.getDiscount(origin, discountItem);
  }

  getLimits() {}

  getPlanStatus() {
    let {planStatus, company_id} = this;
    if (planStatus) {
      return Promise.resolve(planStatus);
    }
    return new Plan(company_id).getStatus().then(planStatus => {
      this.planStatus = planStatus;
      return planStatus;
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

}
