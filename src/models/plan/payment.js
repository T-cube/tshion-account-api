import config from 'config';
import Pay from '@ym/payment';
import {ApiError} from 'lib/error';

import C from 'lib/constants';
import db from 'lib/database';
import {indexObjectId} from 'lib/utils';

import ChargeOrder from 'models/plan/charge-order';
import PlanOrder from 'models/plan/plan-order';

export default class Payment {

  constructor() {
    this.methods = [
      {
        key: C.PAYMENT_METHOD.ALIPAY,
        title: '支付宝'
      },
      {
        key: C.PAYMENT_METHOD.WECHAT,
        title: '微信支付'
      },
      {
        key: C.PAYMENT_METHOD.BALANCE,
        title: '余额'
      }
    ];
    this.init();
  }

  init() {
    this.pay = new Pay(config.get('payment'));
  }

  getMethods() {
    return this.methods;
  }

  getInstance(method) {
    return this.methods[method].instance;
  }

  pay(order, payMethod) {
    return this.payWechat(order);
  }

  getUrls() {
    return {
      notify_url: 'http://tlifang.com/hahaha',
      redirect_url: 'http://tlifang.com/hahaha'
    };
  }

  payWechat(order) {
    let {notify_url, redirect_url} = this.getUrls();
    return this.pay.createPay({
      type:'wxpay',
      opts: {
        method: this.pay.wxpay.trade_type.NATIVE, // NATIVE | APP | JSAPI
        notify_url: encodeURIComponent(notify_url),
        redirect_url: encodeURIComponent(redirect_url),
        title: order.order_type,
        total_fee: 1 || order.paid_sum, // TODO
        spbill_create_ip: '110.84.35.141'
      }
    })
    .then(data => {
      console.log({data});
      let {code_url} = data;
      if (code_url) {
        return this.createChargeOrder(C.CHARGE_TYPE.PLAN, order, data).then(() => {
          return {code_url};
        });
      }
    });
  }

  createChargeOrder(chargeType, order, payment_data) {
    return ChargeOrder.create(chargeType, order, payment_data);
  }

  handleWechatPayResponse(response) {
    // savePaymentResponse
    return ChargeOrder.savePaymentNotifyAndGetData(response)
    .then(chargeData => chargeData && chargeData.order_id);
  }

  // handlePaySuccess(order, paymentInfo, transactionId) {
  //
  // }
  //
  // commitPaySuccess(order, paymentInfo, transactionId) {
  //
  // }

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
              balance: doc.balance - paid_sum,
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

  payRecharge(recharge) {
    // C.CHARGE_TYPE.RECHARGE
  }

  queryWechatOrder({out_trade_no, order_id}) {
    return this.pay.query({
      type: 'wxpay',
      out_trade_no
    }).then(payment_query => {
      if (!payment_query || payment_query.trade_state != 'SUCCESS') {
        return {ok: 0};
      }
      return PlanOrder.init({order_id})
      .then(planOrder => {
        if (!planOrder) {
          return {ok: 0};
        }
        return ChargeOrder.savePaymentQueryAndGetData(payment_query)
        .then(() => planOrder.handlePaySuccess())
        .then(() => ({ok: 1}));
      });
    });
  }

}
