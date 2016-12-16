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
    let {amount} = props;
    this.original_sum = amount;
    this.paid_sum = amount;
    this.order_type = C.ORDER_TYPE.RECHARGE;
  }

  create({amount}) {
    let {company_id, user_id, discount} = this;
    return this.getDiscount().then(() => {
      let data = {
        amount,
        company_id,
        user_id,
        original_sum: this.original_sum,
        paid_sum: this.paid_sum,
        discount: this.discount,
        date_create: new Date(),
        date_update: new Date(),
      };
      return db.payment.recharge.insert(data);
    });
  }

  getDiscount() {
    return this.getCouponDiscount()
    .then(() => this.getChargeDiscount());
  }

  getChargeDiscount() {
    return Promise.resolve(0);
  }

}
