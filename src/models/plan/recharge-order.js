import _ from 'underscore';
import Promise from 'bluebird';

import db from 'lib/database';
import C from 'lib/constants';
import Balance from 'models/plan/balance';
import Transaction from 'models/plan/transaction';

export default class RechargeOrder {

  constructor() {}

  static handlePaySuccess(recharge_id, charge_id) {
    return db.payment.recharge.findOne({_id: recharge_id})
    .then(recharge => {
      if (!recharge) {
        throw new Error('invalid_recharge');
      }
      return Transaction.init('recharge_success', {recharge: recharge_id})
      .then(transactionId => (
        Transaction.start(transactionId).then(() => (
          RechargeOrder.doHandlePaySuccess(recharge, charge_id, transactionId)
        ))
        .then(() => Transaction.commit(transactionId))
        .then(() => (
          RechargeOrder.commitHandlePaySuccess(recharge, transactionId)
        ))
        .then(() => Transaction.done(transactionId))
      ));
    });
  }

  static doHandlePaySuccess(recharge, charge_id, transactionId) {
    let {company_id, amount, payment_method} = recharge;
    return Promise.all([
      Balance.incBalance(company_id, amount, transactionId, {
        recharge: _.pick(recharge, '_id', 'amount', 'recharge_no')
      }),
      db.payment.recharge.update({_id: recharge._id}, {
        $set: {
          status: C.ORDER_STATUS.SUCCEED,
          charge_id,
          payment: {
            date_paid: new Date(),
            method: payment_method
          },
        },
        $addToSet: {
          transactions: transactionId
        }
      })
    ]);
  }

  static commitHandlePaySuccess(recharge, transactionId) {
    let {company_id} = recharge;
    return Promise.all([
      Balance.commitIncBalance(company_id, transactionId),
      db.payment.recharge.update({_id: recharge._id}, {
        $pull: {
          transactions: transactionId
        }
      })
    ]);
  }

}
