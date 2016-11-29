import _ from 'underscore';
import Promise from 'bluebird';

import C from 'lib/constants';
import db from 'lib/database';
import Payment from 'models/plan/payment';
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
    this.coupon = [];
    this.times = 0;
  }

  getProducts() {
    return this.products;
  }

  getTimes() {
    return this.times;
  }

  setProducts(products) {
    products = _.flatten(products);
    this.products = this.products.concat(products);
  }

  setTimes(times) {
    this.times = times;
  }

  withCoupon(coupon) {
    this.coupon = coupon;
  }

  useCoupon() {
    this.coupon; // TODO
  }

  save() {
    return this.prepare().then(order => {
      order.status = 'created';
      return Promise.all([
        this.useCoupon(),
        db.payment.order.insert(order)
      ])
      .then(doc => doc[1]);
    });
  }

  prepare() {
    let { user_id, company_id, products } = this;
    if (!this.canAddProducts()) {

    }
    if (this.coupon && !this.isCouponAvaliable(this.coupon)) {

    }
    // products.map(product => {});
    let order = {
      user_id,
      company_id,
      products,
      original_price: ProductDiscount.getOriginalFeeOfProducts(products),
      paid_amount: 0,
      status: null,
      date_create: new Date(),
      date_update: new Date(),
    };
    return this.getDiscount(order);
  }

  canAddProducts() {
    let result = false;
    this.products.map(product => {
      let { product_no, quantity } = product;

    });
    return result;
  }

  getCoupons() {
    return db.company.coupon.findOne({
      _id: this.company_id
    }, {
      list: 1
    })
    .then(coupon => {
      if (!coupon) {
        return [];
      }
      return db.plan.coupon.find({
        _id: {$in: coupon.list},
        'period.date_start': {$lt: new Date()},
        'period.data_end': {$gte: new Date()},

      });
    })
    .then(coupons => {
      // coupons item isAvaliable
      coupons.forEach(coupon => {
        coupon.isAvaliable = this.isCouponAvaliable(coupon);
      });
      return coupons;
    });
  }

  isCouponAvaliable(coupon) {
    let { criteria } = coupon;
    // ...
    return true;
  }

  getDiscount(order) {
    return this.getProductDiscount(order.products).then(productDiscount => {
      order.product_discount = productDiscount;
      let couponDiscount = this.getCouponDiscount(order);
      order.coupon_discount = couponDiscount;
      return this.getPayDiscount(order);
    })
    .then(payDiscount => {
      order.pay_discount = payDiscount;
      order.paid_amount = order.original_price - order.product_discount.total_discount - order.pay_discount;
      return order;
    });
  }


  getCouponDiscount(products) {
    return;
  }

  getProductDiscount(products) {
    return ProductDiscount.getDiscount(products);
  }

  getPayDiscount(order) {
    return PaymentDiscount.getDiscount(order);
  }

  pay(orderId, payment_method) {
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
