import Promise from 'bluebird';
import crypto from 'crypto';
import moment from 'moment';
import config from 'config';

import {ApiError} from 'lib/error';
import C from 'lib/constants';
import db from 'lib/database';

const ORDER_EXPIRE_MINUTES = config.get('order.expire_minutes');
let randomBytes = Promise.promisify(crypto.randomBytes);

export default class Recharge {

  constructor({company_id, user_id}) {
    this.company_id = company_id;
    this.user_id = user_id;
    this.original_sum = 0;
    this.paid_sum = 0;
  }

  create({amount, payment_method}) {
    let {company_id, user_id} = this;
    amount = parseInt(amount);
    return this.ensureIsValid(amount)
    .then(() => this.createOrderNo())
    .then(recharge_no => {
      let paid_sum = amount;
      let data = {
        amount,
        company_id,
        user_id,
        paid_sum,
        payment_method,
        recharge_no,
        status: C.ORDER_STATUS.CREATED,
        date_create: new Date(),
        date_update: new Date(),
        date_expires: moment().add(ORDER_EXPIRE_MINUTES, 'minute').toDate(),
      };
      return db.payment.recharge.insert(data);
    });
  }

  ensureIsValid(amount) {
    return this.getLimits().then(limits => {
      if (!amount || amount > limits.amount.max || amount < limits.amount.min) {
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

  createOrderNo() {
    return randomBytes(2)
    .then(buffer => {
      let randomStr = (parseInt(buffer.toString('hex'), 16)).toString().substr(0, 4);
      return 'R' + moment().format('YYYYMMDDHHmmssSSS') + randomStr;
    });
  }

}
