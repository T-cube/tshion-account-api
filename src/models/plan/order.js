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
    this.quantity = 0;
  }

  getProducts() {
    return this.products;
  }

  getQuantity() {
    return this.products[0].quantity;
  }

  setProducts(products, quantity) {
    products = _.flatten(products);
    this.quantity = quantity;
    this.products = this.products.concat(products);
  }

  withCoupons(...coupons) {
    coupons = _.flatten(coupons);
    this.coupons = this.coupons.concat(coupons);
  }

  save() {
    this.prepare().then(order => {
      order.status = 'created';
      return db.payment.order.insert(order);
    });
  }

  prepare() {
    let { user_id, company_id, products } = this;
    if (!this.canAddProducts()) {

    }
    if (!this.canUseCoupons() && this.coupon.length) {

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
    order = this.getCouponDiscount(order);
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

  getCouponDiscount(products) {

  }

  getDiscount(order) {
    return this.getProductDiscount(order.products).then(productDiscount => {
      order.product_discount = productDiscount;
      return this.getPayDiscount();
    })
    .then(payDiscount => {
      order.pay_discount = payDiscount;
      order.paid_amount = order.original_price - order.product_discount.total_discount - order.pay_discount;
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
