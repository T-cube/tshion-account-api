import _ from 'underscore';
import Promise from 'bluebird';
import config from 'config';

import { ApiError } from 'lib/error';
import C from 'lib/constants';
import db from 'lib/database';
import BaseOrder from './base';

export default class RechargeOrder extends BaseOrder {

  constructor(props) {
    super(props);
    this.order_type = C.ORDER_TYPE.RECHARGE;
  }

  prepare() {
    return this.getDiscount().then(() => {
      let order = {

      };

    });
  }

  save() {
    
  }

  init({amount}) {
    this.amount = amount;
    return Promise.resolve();
  }

  isValid() {
    let isValid = true;
    return Promise.resolve({isValid});
  }

  getLimits() {
    return Promise.resolve({});
  }

  getDiscount() {
    return this.getProductsDiscount()
    .then(() => this.getCouponDiscount())
    .then(() => this.getChargeDiscount());
  }

  getChargeDiscount() {
    return Promise.resolve(0);
  }

}
