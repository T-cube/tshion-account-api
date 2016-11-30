import _ from 'underscore';
import Promise from 'bluebird';

import C from 'lib/constants';
import db from 'lib/database';
import Coupon from 'models/plan/coupon';
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
    this.times = 0;
    this.original_sum = 0;
    this.paid_amount = 0;
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
    return this.prepare().then(order => {
      order.status = 'created';
      return Promise.all([
        this.updateUsedCoupon(),
        db.payment.order.insert(order)
      ]);
    })
    .then(doc => doc[1]);
  }

  prepare() {
    let { products } = this;
    if (!this.canAddProducts()) {
      throw new Error('invalid product');
    }
    this.original_sum = ProductDiscount.getOriginalFeeOfProducts(products);
    return this.getDiscount().then(() => ({
      user_id: this.user_id,
      company_id: this.company_id,
      order_type: this.order_type,
      products: this.products,
      times: this.times,
      original_sum: this.original_sum,
      paid_amount: this.paid_amount,
      coupon: this.coupon,
      status: this.status,
      date_create: this.date_create,
      date_update: this.date_update,
    }));
  }

  canAddProducts() {
    let { products } = this;
    if (!products || !products.length) {
      return false;
    }
    let product_no_list = products.map(product => product.product_no);
    if (_.uniq(product_no_list).length != product_no_list.length) {
      return false;
    }
    let result = false;
    products.map(product => {
      let { product_no, quantity } = product;
      if (quantity > 12) {
        return false;
      }
      // TODO
    });
    return result;
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
    let { criteria, products } = coupon;
    let order = this.order;
    if (coupon.products === null) {
      if (order.paid_sum && _.isInt(criteria.total_fee) && order.paid_sum >= criteria.total_fee) {
        return true;
      } else if (order.times && _.isInt(criteria.times) && order.times >= criteria.times) {
        return true;
      }
    } else {
      for (let product_no in products) {
        let product = _.find(order.products, item => item.product_no == product_no);
        if (product && _.isInt(criteria.quantity) && product.quantity >= criteria.quantity) {
          return true;
        } else if (product.sum && _.isInt(criteria.total_fee) && product.sum >= criteria.total_fee) {
          return true;
        }
      }
    }
    return false;
  }

  getDiscount() {
    return this.getProductDiscount().then(productDiscount => {
      this.product_discount = productDiscount;
      return this.getCouponDiscount();
    })
    .then(couponDiscount => {
      this.coupon_discount = couponDiscount;
      return this.getPayDiscount();
    })
    .then(payDiscount => {
      this.pay_discount = payDiscount;
      this.paid_sum = this.original_sum - this.product_discount.total_discount - this.pay_discount - this.coupon_discount;
    });
  }

  getCouponDiscount() {
    let order = this.order;
    if (!this.coupon) {
      return Promise.resolve();
    }
    return new Coupon(this.company_id).getCoupon(this.coupon).then(coupon => {
      if (!coupon || !this.isCouponAvaliable(coupon)) {
        this.coupon = undefined;
        return null;
      }
      let coupon_discount;
      let { criteria, products } = coupon;
      if (coupon.products === null) {
        // TODO

      } else {
        for (let product_no in products) {
          let product = _.find(order.products, item => item.product_no == product_no);
          if ((product && _.isInt(criteria.quantity) && product.quantity >= criteria.quantity)
            || (product.sum && _.isInt(criteria.total_fee) && product.sum >= criteria.total_fee)) {
            // TODO

          }
        }
        return coupon_discount;
      }
    });
  }

  getProductDiscount() {
    return ProductDiscount.getDiscount(this.order.products);
  }

  getPayDiscount() {
    return PaymentDiscount.getDiscount(this.order);
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
