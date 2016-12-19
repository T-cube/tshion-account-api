import config from 'config';
import Pay from '@ym/payment';
import {ApiError} from 'lib/error';

import C from 'lib/constants';
import db from 'lib/database';
import {indexObjectId} from 'lib/utils';

import ChargeOrder from 'models/plan/charge-order';

export default class Payment {

  constructor() {

    this.methods = {
      [C.PAYMENT_METHOD.ALIPAY]: {
        title: '支付宝'
      },
      [C.PAYMENT_METHOD.WECHAT]: {
        title: '微信支付'
      },
      [C.PAYMENT_METHOD.BALANCE]: {
        title: '余额'
      }
    };
    this.init();
  }

  init() {
    this.pay = new Pay(config.get('payment'));
  }

  getMethods(orderId) {
    // if (orderId)
    // return db.plan.order.find({_id: orderId})
    return this.methods;
  }

  getInstance(method) {
    return this.methods[method].instance;
  }

  pay(order, payMethod) {
    return this.payWechat(order);
  }

  payWechat(order) {
    let {notify_url, redirect_url} = this.getUrls();
    return this.pay.createPay({
      type:'wxpay',
      opts:{
        method: this.pay.wxpay.trade_type.NATIVE, // NATIVE | APP | JSAPI
        notify_url: encodeURIComponent(notify_url),
        redirect_url: encodeURIComponent(redirect_url),
        title: order.order_type,
        total_fee: order.paid_sum,
        spbill_create_ip: '110.84.35.141'
      }
    })
    .then(data => {
      let {code_url} = data;
      if (code_url) {
        return this.createChargeOrder(order, data).then(() => {
          return {code_url};
        });
      }
    });
  }

  createChargeOrder(order, payment) {
    return ChargeOrder.create(order, payment);
  }

  payWithBalance(order, transactionId) {
    let {paid_sum, company_id} = order;
    if (paid_sum > 0) {
      return db.payment.balance.findOne({
        _id: company_id
      })
      .then(doc => {
        let transactionReach = doc && doc.transactions && (indexObjectId(doc.transactions, transactionId) >= 0);
        if (!doc || (!transactionReach && doc.balance < paid_sum)) {
          return {ok: false, error: 'balance_insufficient'};
        }
        if (transactionReach) {
          return {ok: true};
        }
        return db.payment.balance.update({
          _id: company_id
        }, {
          $inc: {
            balance: -paid_sum
          },
          $addToSet: {
            transactions: transactionId,
          },
          $push: {
            log: {
              amount: -paid_sum,
              order: order._id,
              date_create: new Date(),
            }
          }
        })
        .then(() => ({ok: true}));
      });
    }
    return Promise.resolve({ok: true});
  }

  commitPayWithBalance(order, transactionId) {
    let {company_id} = order;
    return db.payment.balance.update({
      _id: company_id
    }, {
      $pull: {
        transactions: transactionId
      }
    });
  }

}
