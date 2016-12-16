

import C from 'lib/constants';
import db from 'lib/database';


export default class PlanOrder {

  constructor() {}

  static getPendingOrder(company_id) {
    return db.payment.order.findOne({
      company_id: company_id,
      status: {$in: [C.ORDER_STATUS.CREATED, C.ORDER_STATUS.PAYING]}
    });
  }

  static hasPendingOrder(company_id) {
    return db.payment.order.count({
      company_id: company_id,
      status: {$in: [C.ORDER_STATUS.CREATED, C.ORDER_STATUS.PAYING]}
    });
  }

  static payPendingOrder(company_id) {
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

  static updateOrderPaidWithBalance(order) {
    return db.payment.order.update({
      _id: order._id
    }, {
      $set: {
        status: C.ORDER_STATUS.SUCCEED,
        payment: {
          method: C.PAYMENT_METHOD.BALANCE,
          date_paid: new Date()
        },
      }
    });
  }

}
