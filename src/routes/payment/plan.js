import _ from 'underscore';
import express from 'express';
import Promise from 'bluebird';
import config from 'config';
import bodyParser from 'body-parser';
import {ObjectId} from 'mongodb';

import {ApiError} from 'lib/error';
import db from 'lib/database';
import C from 'lib/constants';
import PlanOrder from 'models/plan/plan-order';

let api = express.Router();
export default api;

api.use(express.query());
// api.use(bodyParser.json());
api.use(bodyParser.urlencoded({ extended: true }));

api.get('/pay', (req, res, next) => {
  let {payment_method, token} = req.query;
  if (payment_method != 'alipay' || !token) {
    throw new ApiError(400, 'invalid_params');
  }
  let tokenKey = `pay-token-${token}`;
  return req.model('redis').hmget(tokenKey)
  .then(doc => {
    if (!doc) {
      throw new ApiError(404);
    }
    let {company_id, order_id} = doc;
    company_id = ObjectId(company_id);
    order_id = ObjectId(order_id);
    return PlanOrder.init({company_id, order_id})
    .then(planOrder => {
      if (!planOrder) {
        throw new ApiError(400, 'invalid_order_status');
      }
      return req.model('payment').payOrder(planOrder.order, payment_method)
      .then(data => {
        if (!data) {
          throw new ApiError(500);
        }
        if (data.url) {
          return res.redirect(data.url);
        }
      });
    });
  })
  .catch(next);
});

api.all('/notify/:payment_method', (req, res, next) => {
  let notify = !_.isEmpty(req.body) ? req.body : req.query;
  if (_.isEmpty(notify)) {
    throw new ApiError(400);
  }
  let {payment_method} = req.params;
  if (!_.contains(['wxpay', 'alipay'], payment_method)) {
    throw new ApiError(404);
  }
  console.log({notify});
  // checkSign(data).catch(next);
  return req.model('payment').processNotify(payment_method, notify)
  .then(doc => {
    if (req.method == 'GET') {
      if (!doc) {
        return res.redirect(config.get('webUrl'));
      }
      let {company_id, order_id, recharge_id} = doc;
      if (doc.order_id) {
        let url = config.get('webUrl') + `oa/company/${company_id}/profile/expense/order/detail/${order_id}`;
        return res.redirect(url);
      }
      if (doc.recharge_id) {
        let url = config.get('webUrl') + `oa/company/${company_id}/profile/expense/order/detail/${recharge_id}`;
        return res.redirect(url);
      }
    } else {
      if (payment_method == 'wxpay') {
        return res.send(
          '<xml>' +
          '<return_code><![CDATA[SUCCESS]]></return_code>' +
          '<return_msg><![CDATA[OK]]></return_msg>' +
          '</xml>'
        );
      } else {
        return res.send('success');
      }
    }
  })
  .catch(next);
});
