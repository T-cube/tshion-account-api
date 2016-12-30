import express from 'express';
import Promise from 'bluebird';
import config from 'config';
import bodyParser from 'body-parser';

import Payment from 'models/plan/payment';
import PlanOrder from 'models/plan/plan-order';

let api = express.Router();
export default api;

// api.use(express.query());
api.use(bodyParser.json());
// api.use(bodyParser.urlencoded({ extended: true }));

api.get('/pay/:token', (req, res, next) => {

});

api.post('/wechat', (req, res, next) => {
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
