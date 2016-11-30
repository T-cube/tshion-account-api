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
  }

  getMethods(orderId) {
    // if (orderId)
    // return db.plan.order.find({_id: orderId})
    return this.methods;
  }

  getInstance(method) {
    return this.methods[method].instance;
  }

}
