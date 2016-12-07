import _ from 'underscore';
import Promise from 'bluebird';

import { ApiError } from 'lib/error';
import C from 'lib/constants';
import db from 'lib/database';
import Coupon from 'models/plan/coupon';
import Payment from 'models/plan/payment';
import Discount from 'models/plan/discount';
import Plan from 'models/plan/plan';
import PaymentDiscount from 'models/plan/payment-discount';
import ProductDiscount from 'models/plan/product-discount';


export default class Order {

  constructor(options) {
    let { user_id, company_id } = options;
    if (!user_id) {
      throw new Error('invalid user_id');
    }
    if (!company_id) {
      throw new Error('invalid company_id');
    }
    this.user_id = user_id;
    this.company_id = company_id;
    this.order_type = C.PAYMENT.ORDER.TYPE.BUY;
    this.products = [];
    this.times = 0;
    this.original_sum = 0;
    this.paid_sum = 0;
    this.coupon = undefined;
    this.status = undefined;
    this.date_create = new Date();
    this.date_update = new Date();
  }

  getProducts() {
    return this.products;
  }

  getTimes() {
    return this.times;
  }

  setProducts(products) {
    products.forEach(product => {
      product.sum = product.original_price * product.quantity;
    });
    this.products = products;
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
    return this.getPendingOrder()
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
    let { products } = this;
    return this.isValid().then(({error, isValid}) => {
      if (!isValid) {
        return {
          isValid,
          error,
          limits: this.limits,
        };
      }
      this.paid_sum = this.original_sum = ProductDiscount.getOriginalFeeOfProducts(products);
      return this.getDiscount().then(() => ({
        isValid,
        limits: this.limits,
        order: {
          user_id: this.user_id,
          company_id: this.company_id,
          order_type: this.order_type,
          products: this.products,
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
    return this.getLimits().then(({member_count}) => {
      let memberNum = _.find(this.products, product => product.product_no == 'P0002');
      let isValid = !member_count || (memberNum && memberNum.quantity >= member_count);
      let error;
      if (!isValid) {
        error = 'invalid_member_count';
      }
      return {isValid, error};
    });
  }

  getPendingOrder() {
    return db.payment.order.findOne({
      company_id: this.company_id,
      status: {$in: ['created', 'paying']}
    });
  }

  getCoupons() {
    return new Coupon(this.company_id).getCoupons()
    .then(coupons => {
      coupons.forEach(coupon => {
        coupon.isAvaliable = this.isCouponAvaliable(coupon);
      });
      return coupons;
    });
  }

  isCouponAvaliable(coupon) {
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

  getCouponDiscount() {
    if (!this.coupon) {
      return Promise.resolve();
    }
    return new Coupon(this.company_id).getCoupon(this.coupon).then(coupon => {
      if (!coupon || !this.isCouponAvaliable(coupon)) {
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
      return db.product.discount.find({
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
      product.sum -= discountInfo.fee;
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

  getLimits(plan) {
    if (this.limits) {
      return Promise.resolve(this.limits);
    }
    return Promise.all([
      Plan.getDefaultMemberCount(plan),
      db.company.findOne({_id : this.company_id}, {
        'members._id': 1
      })
    ])
    .then(([defaultCount, comapny]) => {
      let member_count = comapny.members.length - defaultCount;
      this.limits = {
        member_count: member_count < 0 ? 0 : member_count
      };
      return this.limits;
    });
  }

  static pay(orderId, payment_method) {
    let { user_id, company_id } = this;
    return db.payment.order.findOne({
      user_id,
      company_id,
      _id: orderId,
    })
    .then(order => {
      let paymentData = {};
      Payment.getInstance(payment_method).createPay(paymentData);
    });
  }

}
