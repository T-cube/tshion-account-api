import _ from 'underscore';
import config from 'config';
import Pay from '@ym/payment';
import Qr from 'qr-image';

import C from 'lib/constants';
import ChargeOrder from 'models/plan/charge-order';
import RechargeOrder from 'models/plan/recharge-order';
import PlanOrder from 'models/plan/plan-order';
import Balance from 'models/plan/balance';

export default class Payment {

  constructor() {
    this.pay = new Pay(config.get('payment'));
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

  payRecharge(recharge) {
    let {payment_method} = recharge;
    return this._pay(C.CHARGE_TYPE.RECHARGE, payment_method, recharge);
  }

  getUrls(payment_method) {
    return {
      notify_url: config.get('apiUrl') + `/api/payment/plan/${payment_method}`,
      redirect_url: config.get('apiUrl') + `/api/payment/plan/${payment_method}`,
    };
  }

  _pay(charge_type, payment_method, order) {
    let {notify_url, redirect_url} = this.getUrls(payment_method);
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
      return this.createChargeOrder(charge_type, payment_method, order, payment_data)
      .then(() => this.parseResponse(charge_type, payment_method, order, payment_data));
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

  createChargeOrder(charge_type, payment_method, order, payment_data) {
    return ChargeOrder.create(charge_type, order, payment_method, payment_data);
  }

  payWithBalance(order, transactionId) {
    let {paid_sum, company_id} = order;
    return Balance.incBalance(company_id, -paid_sum, transactionId, {
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

  processNotify(payment_method, notify) {
    let success;
    if (payment_method == 'wxpay') {
      success = notify.result_code == 'SUCCESS';
    } else if (payment_method == 'alipay') {
      success = notify.trade_status == 'TRADE_SUCCESS' || notify.trade_status == 'TRADE_FINISHED';
    }
    if (!success) {
      return Promise.resolve();
    }
    return ChargeOrder.savePaymentNotifyAndGetData(notify)
    .then(chargeData => {
      if (!chargeData) {
        return;
      }
      let {charge_type, order_id, recharge_id} = chargeData;
      let charge_id = chargeData._id;
      if (charge_type == C.CHARGE_TYPE.PLAN) {
        return PlanOrder.init({order_id})
        .then(planOrder => {
          if (planOrder && planOrder.get('status') != C.ORDER_STATUS.SUCCEED) {
            return planOrder.handlePaySuccess(payment_method, charge_id);
          }
        });
      } else if (charge_type == C.CHARGE_TYPE.RECHARGE) {
        return RechargeOrder.handlePaySuccess(recharge_id, charge_id);
      }
    });
  }

  handleWechatPayResponse(response) {
    // savePaymentResponse
    return ChargeOrder.savePaymentNotifyAndGetData(response)
    .then(chargeData => chargeData && chargeData.order_id);
  }

  query(payment_method, props) {
    let promise;
    switch (payment_method) {
    case 'wxpay':
      promise = this.queryWechatOrder(props.out_trade_no);
      break;
    case 'alipay':
      promise = this.queryAlipayOrder(props.out_trade_no);
      break;
    }
    return promise.then(({ok, payment_query}) => {
      if (!payment_query || !ok) {
        return C.ORDER_STATUS.PAYING;
      }
      return this.accessQueryOk(props, payment_query, payment_method)
      .then(() => C.ORDER_STATUS.SUCCEED);
    });
  }

  queryWechatOrder(out_trade_no) {
    return this.pay.query({
      type: 'wxpay',
      out_trade_no
    }).then(payment_query => {
      if (!payment_query) {
        return {ok: 0, info: 'payment_not_found'};
      }
      let {trade_state} = payment_query;
      let ok = trade_state != 'SUCCESS';
      return {ok, payment_query};
    })
    .catch(e => {
      if (e instanceof Error) {
        console.error(e);
      }
      return {ok: 0, info: 'payment_not_found'};
    });
  }

  queryAlipayOrder(out_trade_no) {
    return this.pay.query({
      type: 'alipay',
      out_trade_no
    }).then(payment_query => {
      payment_query = payment_query && payment_query.alipay_trade_query_response;
      if (!payment_query) {
        return {ok: 0, info: 'payment_not_found'};
      }
      let {trade_status} = payment_query;
      let ok = trade_status != 'TRADE_SUCCESS';
      return {ok, payment_query};
    })
    .catch(e => {
      if (e instanceof Error) {
        console.error(e);
      }
      return {ok: 0, info: 'payment_not_found'};
    });
  }

  accessQueryOk({order_id, recharge_id}, payment_query, payment_method) {
    if (recharge_id) {
      return this._accessQueryRechargeOk(recharge_id, payment_query);
    } else if (order_id) {
      return this._accessQueryOrderOk(order_id, payment_query, payment_method);
    }
  }

  _accessQueryOrderOk(order_id, payment_query, payment_method) {
    return PlanOrder.init({order_id})
    .then(planOrder => {
      if (!planOrder) {
        return {ok: 0, error: 'invalid_order_status'};
      }
      if (planOrder.get('status') != C.ORDER_STATUS.SUCCEED) {
        return ChargeOrder.savePaymentQueryAndGetData(payment_query)
        .then(chargeData => planOrder.handlePaySuccess(payment_method, chargeData._id));
      }
    });
  }

  _accessQueryRechargeOk(recharge_id, payment_query) {
    return ChargeOrder.savePaymentQueryAndGetData(payment_query)
    .then(chargeData => {
      if (chargeData) {
        return RechargeOrder.handlePaySuccess(recharge_id, chargeData._id);
      }
    });
  }

}
