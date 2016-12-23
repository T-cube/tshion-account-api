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

api.post('/wechat', (req, res, next) => {
  let response = req.body;
  // checkSign(data).catch(next);
  let {return_code, result_code, err_code} = response;
  // get order from out_trade_no
  // save notify data
  if (return_code == 'SUCCESS' && result_code == 'SUCCESS') {
    return new Payment().handleWechatPayResponse(response)
    .then(order_id => {
      return PlanOrder.init({order_id})
      .then(planOrder => {
        if (!planOrder) {
          throw new Error('invalid_order_status');
        }
        planOrder.handlePaySuccess(response);
      });
    })
    .then(() => res.json('ok'));
  } else if (err_code) {
    // 查询订单
  }
});
