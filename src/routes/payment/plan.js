import express from 'express';
import Promise from 'bluebird';
import config from 'config';
import bodyParser from 'body-parser';

import {ApiError} from 'lib/error';
import db from 'lib/database';
import C from 'lib/constants';
import Payment from 'models/plan/payment';
import PlanOrder from 'models/plan/plan-order';

let api = express.Router();
export default api;

// api.use(express.query());
api.use(bodyParser.json());
// api.use(bodyParser.urlencoded({ extended: true }));

api.get('/pay', (req, res, next) => {
  let {payment_method, token} = req.query;
  if (payment_method != 'alipay' || !token) {
    throw new ApiError(400, 'invalid_params');
  }
  return db.payment.token.findOne({_id: token})
  .then(doc => {
    if (!doc) {
      throw new ApiError(404);
    }
    if (new Date() > doc.expires) {
      throw new ApiError(400, 'expired');
    }
    let {company_id, order_id} = doc;
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

api.post('/notify/:charge_type/:payment_method', (req, res, next) => {
  let response = req.body;
  // checkSign(data).catch(next);
  let {return_code, result_code} = response;
  return new Payment().handleWechatPayResponse(response)
  .then(order_id => {
    if (order_id && return_code == 'SUCCESS' && result_code == 'SUCCESS') {
      return PlanOrder.init({order_id})
      .then(planOrder => {
        if (!planOrder) {
          throw new Error('invalid_order_status');
        }
        return planOrder.handlePaySuccess();
      });
    }
  })
  .then(() => res.send(
    '<xml>' +
      '<return_code><![CDATA[SUCCESS]]></return_code>' +
      '<return_msg><![CDATA[OK]]></return_msg>' +
    '</xml>'
  ))
  .catch(next);
});
