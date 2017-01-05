
import db from 'lib/database';
import C from 'lib/constants';
import { indexObjectId } from 'lib/utils';
import PlanOrder from 'models/plan/plan-order';
import RechargeOrder from 'models/plan/recharge-order';
import Transaction from 'models/plan/transaction';

export default {

  orderPaySuccess() {
    return db.transaction.find({
      type: 'pay_order',
      order: {$exists: true},
      status: {$in: ['pending', 'commited']}
    })
    .forEach(transaction => {
      return PlanOrder.init({order_id: transaction.order})
      .then(planOrder => {
        if (!planOrder) {
          return;
        }
        let {payment_method} = transaction;
        let transactionId = transaction._id;
        if (!indexObjectId(planOrder.get('transactions'), transactionId)) {
          return;
        }
        let paidWithBalance = payment_method == 'balance';
        if (transaction.status == 'pending') {
          return (
            paidWithBalance
              ? planOrder.doPayWithBalance(transactionId)
              : planOrder.doHandlePaySuccess(payment_method, transactionId)
          )
          .then(() => Transaction.commit(transactionId))
          .then(() => (
            paidWithBalance
              ? planOrder.commitPayWithBalance(transactionId)
              : planOrder.commitHandlePaySuccess(transactionId)
          ))
          .then(() => Transaction.done(transactionId));
        } else {
          return (
            paidWithBalance
              ? planOrder.commitPayWithBalance(transactionId)
              : planOrder.commitHandlePaySuccess(transactionId)
          )
          .then(() => Transaction.done(transactionId));
        }
      });
    });
  },

  rechargePaySuccess() {
    return db.transaction.find({
      type: 'recharge_success',
      recharge: {$exists: true},
      status: {$in: ['pending', 'commited']}
    })
    .forEach(transaction => {
      let transactionId = transaction._id;
      return db.payment.recharge.findOne({
        _id: transaction.recharge,
        transactions: transactionId,
        // status: C.ORDER_STATUS.PAYING,
      })
      .then(recharge => {
        if (!recharge) {
          return;
        }
        if (transaction.status == 'pending') {
          return RechargeOrder.doHandlePaySuccess(recharge, transactionId)
          .then(() => Transaction.commit(transactionId))
          .then(() => RechargeOrder.commitHandlePaySuccess(recharge, transactionId))
          .then(() => Transaction.done(transactionId));
        } else {
          return RechargeOrder.commitHandlePaySuccess(recharge, transactionId)
          .then(() => Transaction.done(transactionId));
        }
      });
    });
  }

};
