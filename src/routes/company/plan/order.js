import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';

import db from 'lib/database';
import C, {ENUMS} from 'lib/constants';
import { ApiError } from 'lib/error';
import { validate } from './schema';
import PlanOrder from 'models/plan/plan-order';
import OrderFactory from 'models/plan/order';
import Plan from 'models/plan/plan';
import Payment from 'models/plan/payment';

let api = express.Router();
export default api;

api.post(/\/(prepare\/?)?$/, (req, res, next) => {
  let data = req.body;
  let {order_type} = data;
  if (!_.contains(ENUMS, order_type)) {
    throw new ApiError(400, 'invalid_order_type');
  }
  validate(`create_order_${order_type}`, data);
  let isPrepare = /prepare\/?$/.test(req.url);
  let { plan, member_count, coupon, times } = data;
  let company_id = req.company._id;
  let user_id = req.user._id;

  let orderModel = OrderFactory.getInstance(order_type, {company_id, user_id});
  if (!orderModel) {
    next(new ApiError(400, 'invalid_order_type'));
  }
  orderModel.init({plan, member_count, coupon, times})
  .then(() => {
    if (isPrepare) {
      return Promise.all([
        orderModel.prepare(),
        orderModel.getCoupons(),
      ])
      .then(([info, coupons]) => {
        info.coupons = coupons;
        return info;
      });
    }
    return PlanOrder.init({company_id: req.company._id})
    .then(planOrder => {
      if (planOrder && planOrder.order) {
        throw new ApiError(400, 'exist_pending_order');
      }
      return orderModel.save();
    });
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.get('/pending', (req, res, next) => {
  PlanOrder.init({company_id: req.company._id})
  .then(planOrder => {
    res.json(planOrder && planOrder.order);
  })
  .catch(next);
});

api.post('/pending/pay', (req, res, next) => {
  let data = req.body;
  validate('pay', data);
  let {payment_method} = data;
  let company_id = req.company._id;
  return PlanOrder.init({company_id})
  .then(planOrder => {
    if (!planOrder) {
      throw new ApiError(400, 'invalid_order_status');
    }
    if (payment_method == C.PAYMENT_METHOD.BALANCE) {
      return planOrder.payWithBalance()
      .then(() => res.json({}));
    } else {
      return Payment.pay(planOrder.order)
      .then(doc => {
        if (doc) {
          let {code_url} = doc;
          if (code_url) {
            return res.json({code_url});
          }
        }
        throw new ApiError(500);
      });
    }
  })
  .catch(next);
});
