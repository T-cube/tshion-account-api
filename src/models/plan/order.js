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

  canAddProducts() {
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
    if (coupon.products === null) {
      if (this.paid_sum && _.isInt(criteria.total_fee) && this.paid_sum >= criteria.total_fee) {
        return true;
      } else if (this.times && _.isInt(criteria.times) && this.times >= criteria.times) {
        return true;
      }
    } else {
      for (let product_no in products) {
        let product = _.find(this.products, item => item.product_no == product_no);
        if (product && _.isInt(criteria.quantity) && product.quantity >= criteria.quantity) {
          return true;
        } else if (product && product.sum && _.isInt(criteria.total_fee) && product.sum >= criteria.total_fee) {
          return true;
        }
      }
    }
    return false;
  }

  getDiscount() {
    return this.getProductDiscount().then(() => {
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
      return Promise.resolve(undefined);
    }
    return new Coupon(this.company_id).getCoupon(this.coupon).then(coupon => {
      if (!coupon || !this.isCouponAvaliable(coupon)) {
        this.coupon = undefined;
        return undefined;
      }
      let coupon_discount;
      let { criteria, products, discount } = coupon;
      if (coupon.products === null && discount.type == 'times') {  // for order all products
        coupon_discount = Discount.getDiscount({
          fee: this.paid_sum
        }, discount);
        this.times += coupon_discount.times;
        this.coupon_discount = coupon_discount; // TODO
      } else {
        let productIdListUseCoupon = _.filter(this.products, item => _.contains(products, item.product_no)).map(product => product._id);
        coupon_discount = this._getProductDiscountCommon(productIdListUseCoupon, criteria, discount, {coupon: this.coupon});
      }
      return coupon_discount;
    });
  }

  getProductDiscount() {
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
        let discountItem = doc[0];
        let discountInfo = this._getProductDiscountCommon([_.clone(product)], discountItem.criteria, discountItem.discount, {product_discount: discountItem._id});
        if (_.isInt(discountInfo.fee)) {
          product.sum -= discountInfo.fee;
          this.paid_sum -= discountInfo.fee;
        }
        if (_.isInt(discountInfo.number)) {
          product.quantity += discountInfo.number;
        }
        product.discount = (product.discount || []).contact(discountInfo);
        return discountInfo;
      });
    });
  }

  // discount_info like { coupon: this.coupon } or { product_discount: product_discount_id }
  _getProductDiscountCommon(productIdList, criteria, discount, discount_info) {
    let discountSummary;
    for (let productId in productIdList) {
      let product = _.find(this.products, item => item._id == productId);

      if ((product && _.isInt(criteria.quantity) && product.quantity >= criteria.quantity)
        || (product.sum && _.isInt(criteria.total_fee) && product.sum >= criteria.total_fee)) {
        let itemDiscount = Discount.getDiscount(product, discount);
        if (_.isInt(itemDiscount.fee)) {
          product.sum -= itemDiscount.fee;
          discountSummary = discountSummary ? {
            type: discountSummary.type,
            fee: discountSummary.fee + itemDiscount.fee
          } : itemDiscount;
        }
        if (_.isInt(itemDiscount.number)) {
          product.quantity += itemDiscount.number;
          discountSummary = { type: itemDiscount.type };
        }
        product.discount = (product.discount || []).contact(_.extend(itemDiscount, discount_info));
      }
    }
    return discountSummary;
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
