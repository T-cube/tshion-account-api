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
    this.planModel = new Plan(this.company_id);
  }

  static init(order_id, company_id) {
    if (!order_id) {
      throw new Error('invalid_order');
    }
    let criteria = {
      _id: order_id
    };
    if (company_id) {
      criteria.company_id = company_id;
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

  isSucceed() {
    return this.get('status') == C.ORDER_STATUS.SUCCEED;
  }

  isPending() {
    return [C.ORDER_STATUS.CREATED, C.ORDER_STATUS.PAYING].indexOf(this.get('status')) > -1
      && this.get('date_expires') > new Date();
  }

  handlePaySuccess(payment_method, charge_id) {
    let {order} = this;
    return Transaction.init('pay_order', {
      order: order._id,
      charge: charge_id,
      payment_method
    })
    .then(transactionId => {
      return Transaction.start(transactionId)
      .then(() => this.doHandlePaySuccess(payment_method, charge_id, transactionId))
      .then(() => Transaction.commit(transactionId))
      .then(() => this.commitHandlePaySuccess(transactionId))
      .then(() => Transaction.done(transactionId));
    });
  }

  doHandlePaySuccess(payment_method, charge_id, transactionId) {
    let {order} = this;
    return Promise.all([
      this.planModel.updatePaidFromOrder(order, transactionId),
      db.payment.order.update({
        _id: order._id
      }, {
        $set: {
          status: C.ORDER_STATUS.SUCCEED,
          charge_id,
          payment: {
            date_paid: new Date(),
            method: payment_method,
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
      this.planModel.commitUpdatePaidFromOrder(order, transactionId),
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
      return this.planModel.updatePaidFromOrder(order, transactionId);
    });
  }

  commitPayWithBalance(transactionId) {
    let order = this.order;
    return Promise.all([
      new Payment().commitPayWithBalance(order, transactionId),
      this.planModel.commitUpdatePaidFromOrder(order, transactionId),
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

}
