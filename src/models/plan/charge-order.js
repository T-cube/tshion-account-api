import moment from 'moment';
import db from 'lib/database';
import C from 'lib/constants';

export default class ChargeOrder {

  constructor() {}

  static create(charge_type, order, payment_method, payment_data) {
    let {company_id, paid_sum, order_no} = order;
    let {payment_type} = payment_data;
    let data = {
      amount: paid_sum,
      charge_type,
      payment_type,
      payment_method,
      order_no,
      date_create: new Date(),
      status: C.ORDER_STATUS.PAYING,
      payment_data,
    };
    return db.payment.charge.order.update({
      company_id,
      order_id: order._id,
    }, {
      $set: data
    }, {
      upsert: true
    });
  }

  static savePaymentNotifyAndGetData(payment_notify) {
    let {out_trade_no} = payment_notify;
    return db.payment.charge.order.findAndModify({
      query: {
        'payment_data.out_trade_no': out_trade_no,
      },
      update: {
        $set: {payment_notify}
      }
    })
    .then(doc => doc.value);
  }

  static savePaymentQueryAndGetData(payment_query) {
    let {out_trade_no} = payment_query;
    return db.payment.charge.order.findAndModify({
      query: {
        'payment_data.out_trade_no': out_trade_no,
      },
      update: {
        $set: {
          status: C.ORDER_STATUS.SUCCEED,
          payment_query
        }
      }
    })
    .then(doc => doc.value);
  }

  static getChargeInfo(order_id, payment_method) {
    return db.payment.charge.order.findOne({
      order_id,
      payment_method,
      status: C.ORDER_STATUS.PAYING,
      date_create: {$gt: moment().subtract(1, 'hour').toDate()}
    })
    .then(doc => {
      if (!doc) {
        return null;
      }
      return doc.payment_data;
    });
  }

}
