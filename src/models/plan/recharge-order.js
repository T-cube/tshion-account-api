import db from 'lib/database';
import C from 'lib/constants';

export default class RechargeOrder {

  constructor() {}

  list({company_id, page, pagesize}) {
    return db.payment.recharge.find({company_id, status: C.ORDER_STATUS.SUCCEED})
    .sort({
      date_create: -1
    })
    .skip((page - 1) * pagesize)
    .limit(pagesize);
  }

  pay(company_id, orderId) {
    return this.getOrder(company_id, orderId).then(order => {
      if (!order || order.status != C.ORDER_STATUS.CREATED) {
        throw new Error('order cannot paid');
      }
      
    });
  }

  getOrder(company_id, orderId) {
    return db.payment.recharge.findOne({_id: orderId, company_id});
  }

}
