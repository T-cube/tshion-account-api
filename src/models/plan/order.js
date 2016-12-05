import _ from 'underscore';
import Promise from 'bluebird';

import C from 'lib/constants';
import db from 'lib/database';
import Coupon from 'models/plan/coupon';
import Payment from 'models/plan/payment';
import Discount from 'models/plan/discount';
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
    this.coupon_discount = undefined;
    this.pay_discount = undefined;
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
    if (!this.isValid()) {
      return Promise.reject(new Error('invalid products'));
    }
    this.original_sum = ProductDiscount.getOriginalFeeOfProducts(products);
    return this.getDiscount().then(() => ({
      user_id: this.user_id,
      company_id: this.company_id,
      order_type: this.order_type,
      products: this.products,
      times: this.times,
      original_sum: this.original_sum,
      paid_sum: this.paid_sum,
      coupon: this.coupon,
      coupon_discount: this.coupon_discount,
      pay_discount: this.pay_discount,
      status: this.status,
      date_create: this.date_create,
      date_update: this.date_update,
    }));
  }

  isValid() {
    return true;
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
    let result = false;
    if (products === null) {
      if (this.paid_sum && _.isNumber(criteria.total_fee) && this.paid_sum >= criteria.total_fee) {
        result = true;
      } else if (this.times && _.isNumber(criteria.times) && this.times >= criteria.times) {
        result = true;
      }
    } else {
      for (let product_no of products) {
        let product = _.find(this.products, item => item.product_no == product_no);
        if (product && _.isNumber(criteria.quantity) && product.quantity >= criteria.quantity) {
          result = true;
        } else if (product && product.sum && _.isNumber(criteria.total_fee) && product.sum >= criteria.total_fee) {
          result = true;
        }
      }
    }
    return result;
  }

  getDiscount() {
    return this.getProductsDiscount()
    .then(() => {
      return this.getCouponDiscount();
    })
    .then(() => {
      return this.getPayDiscount();
    })
    .then(payDiscount => {
      this.pay_discount = payDiscount;
      this.paid_sum = this.original_sum - (this.product_discount || 0) - (this.pay_discount || 0) - (this.coupon_discount && this.coupon_discount.fee || 0);
    });
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

      let coupon_discount;
      let { criteria, products, discount } = coupon;
      if (coupon.products === null) {  // for order all products
        coupon_discount = Discount.getDiscount({
          total_fee: this.paid_sum,
          times: this.times
        }, discount);
        this.times += coupon_discount.times;
        this.coupon_discount = {
          order: 1,
          discount: coupon_discount
        };
      } else {
        let coupon_discount = _.filter(this.products, item => _.contains(products, item.product_no)).map(product => {
          let discountPerProduct = Discount._getProductDiscount(product);
          this._persistDiscount(discountPerProduct);
          return {
            product: product._id,
            discount: discountPerProduct
          };
        });
        this.coupon_discount = coupon_discount.filter(i => i.discount);
      }
    });
  }

  getProductsDiscount() {
    return Promise.map(this.products, product => {
      let { discount, quantity, sum } = product;
      if (!discount || !discount.length) {
        return;
      }
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
        this._persistDiscount(discountInfo);
      });
    });
  }

  _persistDiscount() {

  }

  _getProductDiscount(product, discountItem) {
    let { criteria, discount } = discountItem;
    let { quantity, sum } = product;
    let origin = {quantity, total_fee: sum};
    if (Discount.isMatch(origin, criteria)) {
      return Discount.getDiscount(origin, discount);
    }
    return null;
  }

  getPayDiscount() {
    return PaymentDiscount.getDiscount(this.paid_sum);
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
