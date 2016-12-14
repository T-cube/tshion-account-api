import config from 'config';
import Pay from '@ym/payment';

import C from 'lib/constants';
import db from 'lib/database';

import ChargeOrder from 'models/plan/charge-order';

export default class Payment {

  constructor() {

    this.methods = {
      alipay: {
        title: '支付宝'
      },
      wechat: {
        title: '微信支付'
      },
      balance: {
        title: '余额'
      }
    };

    this.init();
  }

  getMethods(orderId) {
    // if (orderId)
    // return db.plan.order.find({_id: orderId})
    return this.methods;
  }

  getInstance(method) {
    return this.methods[method].instance;
  }

  init() {
    this.pay = new Pay(config.get('payment'));
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

}
