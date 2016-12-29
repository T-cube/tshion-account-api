import _ from 'underscore';
import C from 'lib/constants';
import db from 'lib/database';
import {ApiError} from 'lib/error';
import Plan from 'models/plan/plan';
import Payment from 'models/plan/payment';

import ChargeOrder from 'models/plan/charge-order';


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

  pay(payment_method) {
    let payment_data = {
      appid: 'wx80bb623*******',
      mch_id: '1348******',
      nonce_str: 'uKJZUSzetduXALVN',
      body: 'heiheihei',
      detail: '',
      out_trade_no: 'WX_14821479349944501',
      total_fee: '100',
      spbill_create_ip: '110.84.35.141',
      notify_url: 'http%253A%252F%252Fwxtest.tlifang.com%252Fredirect',
      trade_type: 'NATIVE',
      return_code: 'SUCCESS',
      return_msg: 'OK',
      sign: '34029ED1B0E5C044ADA5E61FA6BC8CA1',
      result_code: 'SUCCESS',
      prepay_id: 'wx20161117103224e888877af80382167652',
      code_url: 'weixin://wxpay/bizpayurl?pr=XpYtxsN',
      timestamp: 1479349944,
      payment_method
    };
    return ChargeOrder.create('plan', this.order, payment_method, payment_data)
    .then(() => payment_data);
  }

  handlePaySuccess(payment_method) {
    let {order} = this;
    return this.initTransaction(order.payment_method)
    .then(transactionId => {
      return this.startTransaction(transactionId)
      .then(() => this.doHandlePaySuccess(payment_method, transactionId))
      .then(() => this.commitTransaction(transactionId))
      .then(() => this.commitHandlePaySuccess(transactionId))
      .then(() => this.doneTransaction(transactionId));
    });
  }

  doHandlePaySuccess(payment_method, transactionId) {
    // update payment status
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
