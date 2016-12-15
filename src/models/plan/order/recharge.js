import _ from 'underscore';
import Promise from 'bluebird';
import config from 'config';

import { ApiError } from 'lib/error';
import C from 'lib/constants';
import db from 'lib/database';
import Base from './base';

export default class RechargeOrder {

  constructor() {
    this.order_type = C.ORDER_TYPE.RECHARGE;
  }

  prepare({user_id, company_id, amount}) {
    let data = {
      user_id: user_id,
      company_id: company_id,
      original_sum: amount,
    };
  }

  init() {

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
