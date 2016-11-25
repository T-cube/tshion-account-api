import _ from 'underscore';
import Promise from 'bluebird';

import db from 'lib/database';

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
    if (!this.canAddProducts()) {

    }
    if (!this.canUseCoupons()) {

    }
    let data = this._generateOrder();
    return db.payment.order.insert(data);
  }

  _generateOrder() {
    let { user_id, company_id, products } = this;
    products.map(product => {});
    return {
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
      // filter coupons

    });
  }

  getPayDiscount() {
    return 0;
  }

  getUsefulCoupons() {

  }

}
