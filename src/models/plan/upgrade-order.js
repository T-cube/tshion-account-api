import _ from 'underscore';
import Promise from 'bluebird';

import C from 'lib/constants';
import db from 'lib/database';
import Order from './order';
import Payment from 'models/plan/payment';
import PaymentDiscount from 'models/plan/payment-discount';
import ProductDiscount from 'models/plan/product-discount';

export default class UpgradeOrder extends Order {

  constructor(options) {
    super(options);
    this.order_type = C.PAYMENT.ORDER.TYPE.UPGRADE;
  }

  setProducts(products) {
    products = _.flatten(products);
    this.products = this.products.concat(products);
  }

  getUpgradeTimes() {
    return; // TODO return a promise
  }


  prepare() {
    let { user_id, company_id, products } = this;
    if (!this.isValid()) {

    }
    if (this.coupons && !this.isCouponAvailable()) {

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

  isValid() {}

}
