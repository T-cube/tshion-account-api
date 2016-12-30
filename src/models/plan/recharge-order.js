import _ from 'underscore';

import db from 'lib/database';
import C from 'lib/constants';
import Balance from 'models/plan/balance';
import Transaction from 'models/plan/transaction';

export default class RechargeOrder {

  constructor() {}

  list({company_id, page, pagesize}) {
    return db.payment.recharge.find({company_id, status: C.ORDER_STATUS.SUCCEED})
    .sort({
      date_create: -1
    })
    .skip((page - 1) * pagesize)
    .limit(pagesize);
  }

  getOrder(company_id, recharge_id) {
    return db.payment.recharge.findOne({_id: recharge_id, company_id});
  }

  static handlePaySuccess(recharge_id) {
    return db.payment.recharge.findOne({_id: recharge_id})
    .then(recharge => {
      if (!recharge) {
        throw new Error('invalid_recharge');
      }
      let {company_id, amount, payment_method} = recharge;
      return Transaction.init('recharge_success', {recharge_id})
      .then(transactionId => (
        Transaction.start(transactionId).then(() => (
          Promise.all([
            Balance.incBalance(company_id, amount, transactionId, {
              recharge: _.pick(recharge, '_id', 'amount', 'recharge_no')
            }),
            db.payment.recharge.update({_id: recharge_id}, {
              $set: {
                status: C.ORDER_STATUS.SUCCEED,
                payment: {
                  date_paid: new Date(),
                  method: payment_method
                },
              },
              $push: {
                transactions: transactionId
              }
            })
          ])
        ))
        .then(() => Transaction.commit(transactionId))
        .then(() => (
          Promise.all([
            Balance.commitIncBalance(company_id, transactionId),
            db.payment.recharge.update({_id: recharge_id}, {
              $pull: {
                transactions: transactionId
              }
            })
          ])
        ))
        .then(() => Transaction.done(transactionId))
      ));
    });
  }

}
