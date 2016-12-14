import config from 'config';
import Pay from '@ym/payment';

import C from 'lib/constants';
import db from 'lib/database';


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

  pay(order) {
    let notify_url, redirect_url;
    return this.pay.createPay({
      type:'wxpay',
      opts:{
        method: this.pay.wxpay.trade_type.NATIVE, // NATIVE | APP | JSAPI
        notify_url: encodeURIComponent(notify_url),
        redirect_url: encodeURIComponent(redirect_url),
        title: order.order_type,
        total_fee: order.paid_sum,
        spbill_create_ip:'110.84.35.141'
      }
    })
    .then(doc =>console.log(doc));
  }

}
