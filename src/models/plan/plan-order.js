import C from 'lib/constants';
import db from 'lib/database';
import {ApiError} from 'lib/error';
import Plan from 'models/plan/plan';
import Payment from 'models/plan/payment';

export default class PlanOrder {

  constructor(order) {
    if (!order || !order._id) {
      throw new Error('invalid_order');
    }
    this.order = order;
    this.company_id = order.company_id;
  }

  static init({company_id, order_id}) {
    let criteria;
    if (order_id) {
      criteria = {
        _id: order_id
      };
    } else if (company_id) {
      if (company_id) {
        criteria = {
          company_id: company_id,
          status: {$in: [C.ORDER_STATUS.CREATED, C.ORDER_STATUS.PAYING]}
        };
      }
    } else {
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

  payPendingOrder(company_id) {
    return db.payment.order.findAndModify({
      query: {
        company_id: company_id,
        status: C.ORDER_STATUS.CREATED,
      },
      update: {
        status: C.ORDER_STATUS.PAYING
      }
    })
    .then(doc => {
      return doc.value;
    });
  }

  payWithBalance() {
    if (this.get('order_type') == C.ORDER_TYPE.RECHARGE) {
      throw new ApiError(400, 'invalid_order_status');
    }
    if (this.get('transactions') && this.get('transactions').length) {
      throw new ApiError(400, 'transaction_exist');
    }
    return this.initTransaction('balance').then(transactionId => {
      return this.startTransaction(transactionId)
      .then(() => this.doPayWithBalance(transactionId))
      .then(() => this.commitTransaction(transactionId))
      .then(() => this.commitPayWithBalance(transactionId))
      .then(() => this.doneTransaction(transactionId));
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
          method: C.PAYMENT_METHOD.BALANCE,
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

  initTransaction(payment_method) {
    return db.transaction.insert({
      type: 'pay_order',
      order: this.get('_id'),
      payment_method,
      status: 'initial',
      date_create: new Date()
    })
    .then(doc => doc._id);
  }

  startTransaction(transactionId) {
    return this._updateTransactionStatus(transactionId, 'pending');
  }

  commitTransaction(transactionId) {
    return this._updateTransactionStatus(transactionId, 'commited');
  }

  doneTransaction(transactionId) {
    return this._updateTransactionStatus(transactionId, 'done');
  }

  cancelTransaction(transactionId) {
    return this._updateTransactionStatus(transactionId, 'canceled');
  }

  _updateTransactionStatus(transactionId, status) {
    return db.transaction.update({
      _id: transactionId
    }, {
      $set: {status},
      $currentDate: {lastModified: true}
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
