import _ from 'underscore';
import config from 'config';
import Pay from '@ym/payment';
import Qr from 'qr-image';

import C from 'lib/constants';
import {ApiError} from 'lib/error';
import db from 'lib/database';
import {indexObjectId} from 'lib/utils';

import ChargeOrder from 'models/plan/charge-order';
import RechargeOrder from 'models/plan/recharge-order';
import PlanOrder from 'models/plan/plan-order';
import Balance from 'models/plan/balance';

export default class Payment {

  constructor() {
    this.methods = [
      {
        key: 'alipay',
        title: '支付宝'
      },
      {
        key: 'wxpay',
        title: '微信支付'
      },
      {
        key: 'balance',
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

  payOrder(order, payment_method) {
    return ChargeOrder.getChargeInfo(order._id, payment_method)
    .then(payment_data => {
      if (payment_data) {
        return this.parseResponse(C.CHARGE_TYPE.PLAN, payment_method, order, payment_data);
      }
      return this._pay(C.CHARGE_TYPE.PLAN, payment_method, order);
    });
  }

  getUrls(charge_type, payment_method) {
    return {
      notify_url: `http://tlifang.com/api/payment/plan/${charge_type}/${payment_method}`,
      redirect_url: `http://tlifang.com/api/payment/plan/${charge_type}/${payment_method}`,
    };
  }

  _pay(charge_type, payment_method, order) {
    let {notify_url, redirect_url} = this.getUrls(charge_type, payment_method);
    let title, method;
    if (charge_type == C.CHARGE_TYPE.PLAN) {
      title = __(`order_type_${order.order_type}`) + order.plan;
    } else if (charge_type == C.CHARGE_TYPE.RECHARGE) {
      title = __('recharge_order');
    }
    if (payment_method == 'wxpay') {
      method = this.pay.wxpay.trade_type.NATIVE;
    } else if (payment_method == 'alipay') {
      method = this.pay.alipay.method.PC;
    }
    return this.pay.createPay({
      type: payment_method,
      opts: {
        method,
        notify_url,
        redirect_url,
        title,
        total_fee: 1 || order.paid_sum, // TODO
        spbill_create_ip: '110.84.35.141'
      }
    })
    .then(payment_data => {
      return this.createChargeOrder(charge_type, order, payment_method, payment_data)
      .then(() => this.parseResponse({charge_type, payment_method, order, payment_data}));
    })
    .catch(e => console.error(e));
  }

  parseResponse(charge_type, payment_method, order, payment_data) {
    let status = C.ORDER_STATUS.PAYING;
    let response = {status, payment_method};
    if (charge_type == C.CHARGE_TYPE.PLAN) {
      response.order_id = order._id;
      response.order_no = order.order_no;
    } else if (charge_type == C.CHARGE_TYPE.RECHARGE) {
      response.rechargr_id = order._id;
      response.recharge_no = order.recharge_no;
    }
    if (payment_method == 'wxpay') {
      let {code_url} = payment_data;
      let svg = Qr.imageSync(code_url, { type: 'svg' });
      let qr_url = 'data:image/svg+xml;base64,' + new Buffer(svg).toString('base64');
      response.qr_url = qr_url;
    }
    if (payment_method == 'alipay') {
      let {url} = payment_data;
      response.url = url;
    }
    return response;
  }

  createChargeOrder(charge_type, order, payment_method, payment_data) {
    return ChargeOrder.create(charge_type, order, payment_method, payment_data);
  }

  handleWechatPayResponse(response) {
    // savePaymentResponse
    return ChargeOrder.savePaymentNotifyAndGetData(response)
    .then(chargeData => chargeData && chargeData.order_id);
  }

  payWithBalance(order, transactionId) {
    let {paid_sum, company_id} = order;
    return Balance.incBalance(company_id, paid_sum, transactionId, {
      order: _.pick(order, '_id', 'order_no', 'member_count', 'plan', 'order_type')
    })
    .then(() => ({ok: 1}))
    .catch(e => {
      let error;
      if (e.message == 'balance_insufficient') {
        error = 'balance_insufficient';
      }
      return {ok: 0, error};
    });
  }

  commitPayWithBalance(order, transactionId) {
    let {company_id} = order;
    return Balance.commitIncBalance(company_id, transactionId);
  }

  queryWechatOrder({out_trade_no, order_id, recharge_id}) {
    return this.pay.query({
      type: 'wxpay',
      out_trade_no
    }).then(payment_query => {
      if (!payment_query) {
        return {ok: 0, error: 'payment_not_found'};
      }
      let {trade_state, trade_state_desc} = payment_query;
      if (trade_state != 'SUCCESS') {
        return {ok: 0, trade_state, trade_state_desc};
      }
      if (recharge_id) {
        return this._accessQueryRechargeOk(recharge_id, payment_query);
      } else if (order_id) {
        return this._accessQueryOrderOk(order_id, payment_query, 'wxpay');
      }
    })
    .catch(e => {
      console.error(e);
      return {ok: 0, error: 'payment_not_found'};
    });
  }

  queryAlipayOrder({out_trade_no, order_id, recharge_id}) {
    return this.pay.query({
      type: 'alipay',
      out_trade_no
    }).then(payment_query => {
      console.log({payment_query, out_trade_no});
      payment_query = payment_query && payment_query.alipay_trade_query_response;
      if (!payment_query) {
        return {ok: 0, error: 'payment_not_found'};
      }
      let {trade_status} = payment_query;
      if (trade_status != 'TRADE_SUCCESS') {
        return {ok: 0, trade_state: trade_status};
      }
      if (recharge_id) {
        return this._accessQueryRechargeOk(recharge_id, payment_query);
      } else if (order_id) {
        return this._accessQueryOrderOk(order_id, payment_query, 'alipay');
      }
    })
    .catch(e => {
      console.error(e);
      return {ok: 0, error: 'payment_not_found'};
    });
  }

  _accessQueryOrderOk(order_id, payment_query, payment_method) {
    return PlanOrder.init({order_id})
    .then(planOrder => {
      if (!planOrder) {
        return {ok: 0, error: 'invalid_order_status'};
      }
      return ChargeOrder.savePaymentQueryAndGetData(payment_query)
      .then(() => planOrder.handlePaySuccess(payment_method))
      .then(() => ({ok: 1}));
    });
  }

  _accessQueryRechargeOk(recharge_id, payment_query) {
    return ChargeOrder.savePaymentQueryAndGetData(payment_query)
    .then(() => RechargeOrder.handlePaySuccess(recharge_id))
    .then(() => ({ok: 1}));
  }

  payRecharge(recharge) {
    let {payment_method} = recharge;
    return this._pay(C.CHARGE_TYPE.RECHARGE, payment_method, recharge);
  }

}
