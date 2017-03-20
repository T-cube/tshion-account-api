import moment from 'moment';
import db from 'lib/database';
import C from 'lib/constants';

const chrgeExpireMinutes = 60;

export default class ChargeOrder {

  constructor() {}

  static create(charge_type, order, payment_method, payment_data) {
    let {company_id, paid_sum} = order;
    let {payment_type} = payment_data;
    let data = {
      company_id,
      amount: paid_sum,
      charge_type,
      payment_type,
      payment_method,
      date_create: new Date(),
      status: C.CHARGE_STATUS.PAYING,
      payment_data,
    };
    let query = {company_id, status: C.CHARGE_STATUS.PAYING};
    if (charge_type == C.CHARGE_TYPE.PLAN) {
      query.order_id = order._id;
      query.date_create = {$gt: moment().subtract(chrgeExpireMinutes, 'minutes').toDate()};
      data.order_id = order._id;
      data.order_no = order.order_no;
    } else if (charge_type == C.CHARGE_TYPE.RECHARGE) {
      query.recharge_id = order._id;
      data.recharge_id = order._id;
      data.recharge_no = order.recharge_no;
      return db.payment.charge.order.insert(data);
    }
    // cancel charge
    return db.payment.charge.order.findAndModify({
      query,
      update: {$set: {status: C.CHARGE_STATUS.CANCELLED}},
      multi: true
    })
    .then(payingCharge => {
      if (payingCharge.value) {
        // cancel order of thirdparty
      }
      return db.payment.charge.order.insert(data);
    });
  }

  static savePaymentNotifyAndGetData(payment_notify) {
    let {out_trade_no} = payment_notify;
    return db.payment.charge.order.findAndModify({
      query: {
        'payment_data.out_trade_no': out_trade_no,
        status: {$ne: C.CHARGE_STATUS.SUCCEED}
      },
      update: {
        $set: {
          payment_notify,
          status: C.CHARGE_STATUS.SUCCEED,
        }
      }
    })
    .then(doc => doc.value);
  }

  static savePaymentQueryAndGetData(payment_query) {
    let {out_trade_no} = payment_query;
    return db.payment.charge.order.findAndModify({
      query: {
        'payment_data.out_trade_no': out_trade_no,
        status: {$ne: C.CHARGE_STATUS.SUCCEED}
      },
      update: {
        $set: {
          status: C.CHARGE_STATUS.SUCCEED,
          payment_query
        }
      }
    })
    .then(doc => doc.value);
  }

  static getPayingChargeInfo(order_id, payment_method) {
    return db.payment.charge.order.findOne({
      order_id,
      payment_method,
      status: C.CHARGE_STATUS.PAYING,
      date_create: {$gt: moment().subtract(chrgeExpireMinutes, 'minutes').toDate()}
    })
    .then(doc => {
      if (!doc) {
        return null;
      }
      return doc.payment_data;
    });
  }

}
