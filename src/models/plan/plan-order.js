import _ from 'underscore';

import C from 'lib/constants';
import db from 'lib/database';
import {ApiError} from 'lib/error';
import Plan from 'models/plan/plan';
import Payment from 'models/plan/payment';
import Transaction from 'models/plan/transaction';


export default class PlanOrder {

  constructor(order) {
    if (!order || !order._id) {
      throw new Error('invalid_order');
    }
    this.order = order;
    this.company_id = order.company_id;
  }

  static init({company_id, order_id}) {
    let criteria = {};
    if (order_id) {
      criteria._id = order_id;
    }
    if (company_id) {
      criteria.company_id = company_id;
      criteria.status = {$in: [C.ORDER_STATUS.CREATED, C.ORDER_STATUS.PAYING]};
    }
    if (_.isEmpty(criteria)) {
      throw new Error('invalid_params');
    }
    return db.payment.order.findOne(criteria)
    .then(order => {
      if (!order) {
        return null;
      }
      return new PlanOrder(order);
    });
  }

  get(key) {
    return this.order[key];
  }

  handlePaySuccess(payment_method) {
    let {order} = this;
    return Transaction.init('pay_order', {
      order: order._id,
      payment_method
    })
    .then(transactionId => {
      return Transaction.start(transactionId)
      .then(() => this.doHandlePaySuccess(payment_method, transactionId))
      .then(() => Transaction.commit(transactionId))
      .then(() => this.commitHandlePaySuccess(transactionId))
      .then(() => Transaction.done(transactionId));
    });
  }

  doHandlePaySuccess(payment_method, transactionId) {
    let {order} = this;
    return Promise.all([
      new Plan(this.company_id).updatePaidFromOrder(order, transactionId),
      db.payment.order.update({
        _id: order._id
      }, {
        $set: {
          status: C.ORDER_STATUS.SUCCEED,
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

  commitHandlePaySuccess(transactionId) {
    let {order} = this;
    return Promise.all([
      new Plan(this.company_id).commitUpdatePaidFromOrder(order, transactionId),
      db.payment.order.update({
        _id: order._id
      }, {
        $pull: {
          transactions: transactionId
        }
      })
    ]);
  }

  payWithBalance() {
    let {order} = this;
    let {transactions} = order;
    if (transactions && transactions.length) {
      throw new ApiError(400, 'transaction_exist');
    }
    return Transaction.init('pay_order', {
      order: order._id,
      payment_method: 'balance'
    }).then(transactionId => {
      return Transaction.start(transactionId)
      .then(() => this.doPayWithBalance(transactionId))
      .then(() => Transaction.commit(transactionId))
      .then(() => this.commitPayWithBalance(transactionId))
      .then(() => Transaction.done(transactionId));
    });
  }

  doPayWithBalance(transactionId) {
    let order = this.order;
    return new Payment().payWithBalance(order, transactionId)
    .then(({ok, error}) => {
      if (ok) {
        return this.updateOrderPaidWithBalance(transactionId);
      } else {
        return this.cancelTransaction(transactionId)
        .then(() => {
          throw new ApiError(400, error);
        });
      }
    })
    .then(() => {
      return new Plan(this.company_id).updatePaidFromOrder(order, transactionId);
    });
  }

  commitPayWithBalance(transactionId) {
    let order = this.order;
    return Promise.all([
      new Payment().commitPayWithBalance(order, transactionId),
      new Plan(this.company_id).commitUpdatePaidFromOrder(order, transactionId),
      this.commitUpdateOrderPaidWithBalance(transactionId),
    ]);
  }

  updateOrderPaidWithBalance(transactionId) {
    return db.payment.order.update({
      _id: this.get('_id')
    }, {
      $set: {
        status: C.ORDER_STATUS.SUCCEED,
        payment: {
          method: 'balance',
          date_paid: new Date()
        },
      },
      $addToSet: {
        transactions: transactionId
      }
    });
  }

  commitUpdateOrderPaidWithBalance(transactionId) {
    return db.payment.order.update({
      _id: this.get('_id')
    }, {
      $pull: {
        transactions: transactionId
      }
    });
  }

  prepareDegrade() {
    let orderId = this.get('_id');
    return new Plan(this.company_id).getCurrent().then(current => {
      if (!current.date_end || current.date_end < new Date()) {
        return db.payment.order.update({
          _id: orderId,
        }, {
          status: C.ORDER_STATUS.EXPIRED
        })
        .then(() => {
          throw new ApiError(400, 'order_expired');
        });
      }
      return Promise.all([
        db.plan.degrade.insert({
          _id: this.get('company_id'),
          order: orderId,
          time: current.date_end,
          date_create: new Date(),
          status: 'actived'
        }),
        db.payment.order.update({
          _id: orderId,
        }, {
          $set: {
            status: C.ORDER_STATUS.SUCCEED,
          }
        })
      ]);
    });
  }

}
