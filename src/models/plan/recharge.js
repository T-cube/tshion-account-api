import _ from 'underscore';
import Promise from 'bluebird';
import config from 'config';
import crypto from 'crypto';
import moment from 'moment';

import ApiError from 'lib/error';
import C from 'lib/constants';
import db from 'lib/database';
export let randomBytes = Promise.promisify(crypto.randomBytes);

export default class Recharge {

  constructor({company_id, user_id}) {
    this.company_id = company_id;
    this.user_id = user_id;
    this.original_sum = 0;
    this.paid_sum = 0;
  }

  create({amount, payment_method}) {
    let {company_id, user_id} = this;
    return this.isValid()
    .then(() => Promise.all([
      this.getChargeDiscount(amount),
      this.createOrderNo(),
    ]))
    .then(([discount, order_no]) => {
      let {extra_amount} = discount;
      let paid_sum = amount - extra_amount;
      let data = {
        amount,
        company_id,
        user_id,
        paid_sum,
        payment_method,
        order_no,
        discount: extra_amount ? discount : null,
        status: C.ORDER_STATUS.CREATED,
        date_create: new Date(),
        date_update: new Date(),
      };
      return db.payment.recharge.insert(data);
    })
    .then(recharge => {
      // TODO pay recharge order here

    });
  }

  isValid(amount) {
    return this.getLimits().then(limits => {
      if (amount > limits.amount.max || amount < limits.amount.min) {
        throw new ApiError(400, 'invalid_recharge_amount');
      }
    });
  }

  getLimits() {
    return Promise.resolve({
      amount: {
        min: 100,
        max: 1000000000,
      }
    });
  }

  getChargeDiscount(amount) {
    return db.payment.recharge.discount.find({
      amount: {$lte: amount}
    })
    .sort({
      amount: -1
    })
    .limit(1)
    .then(doc => {
      let discount = doc[0];
      if (!discount) {
        return {extra_amount: 0};
      }
      return _.pick(discount, 'extra_amount', '_id', 'amount');
    });
  }

  getChargeDiscounts() {
    return db.payment.recharge.discount.find();
  }

  createOrderNo() {
    return randomBytes(2)
    .then(buffer => {
      let randomStr = (parseInt(buffer.toString('hex'), 16)).toString().substr(0, 4);
      return 'R' + moment().format('YYYYMMDDHHmmssSSS') + randomStr;
    });
  }

}
