import config from 'config';
import Pay from '@ym/payment';
import {ApiError} from 'lib/error';

import C from 'lib/constants';
import db from 'lib/database';

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

  payWithBalance(order) {
    let {paid_sum, company_id} = order;
    if (paid_sum > 0) {
      return db.payment.balance.findOne({
        _id: company_id
      })
      .then(doc => {
        let balance = doc ? doc.balance : 0;
        if (balance < paid_sum) {
          return {ok: false, error: 'balance_insufficient'};
        }
        return db.payment.balance.update({
          _id: company_id
        }, {
          $inc: {
            balance: -paid_sum
          }
        })
        .then(doc => {
          // TODO log balance here
          return {ok: true};
        });
      });
    }
    return Promise.resolve({ok: true});
  }

}
