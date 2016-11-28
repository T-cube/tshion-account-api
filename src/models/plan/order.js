import _ from 'underscore';
import Promise from 'bluebird';

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
    this.products = [];
    this.coupons = [];
  }

  addProducts(...products) {
    products = _.flatten(products);
    this.products.concat(products);
  }

  useCoupons(...coupons) {
    coupons = _.flatten(coupons);
    this.coupons.concat(coupons);
  }


  save() {
    this.prepare().then(data => {
      return db.payment.order.insert(data);
    });
  }

  prepare() {
    let { user_id, company_id, products } = this;
    if (!this.canAddProducts()) {

    }
    if (!this.canUseCoupons()) {

    }
    // products.map(product => {});
    let order = {
      user_id,
      company_id,
      products,
      original_price: 0,
      paid_amount: 0,
      status: '',
      date_create: new Date(),
      date_update: new Date(),
      log: [],
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

  canUseCoupons() {
    this.coupons;
  }

  getAvaliableCoupons() {
    return db.company.coupon.find({
      _id: this.company_id
    }, {
      list: 1
    })
    .then(coupon => {
      return db.coupon.find({
        _id: {$in: coupon.list},
        date_start: {$lt: new Date()},
        data_end: {$gte: new Date()},

      });
    })
    .then(coupons => {
      // coupons item isAvaliable

    });
  }

  getDiscount(order) {
    return this.getProductDiscount(order.products).then(productDiscount => {
      order.product_discount = productDiscount;
      return this.getPayDiscount();
    })
    .then(payDiscount => {
      order.pay_discount = payDiscount;
      return order;
    });
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
