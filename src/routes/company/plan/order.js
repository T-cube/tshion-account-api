import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';

import C from 'lib/constants';
import { ApiError } from 'lib/error';
import { validate } from './schema';
import BaseOrder from 'models/plan/order/base';
import OrderFactory from 'models/plan/order';
import Plan from 'models/plan/plan';
import Payment from 'models/plan/payment';

let api = express.Router();

export default api;


api.post(/\/(prepare\/?)?$/, (req, res, next) => {
  let data = req.body;
  validate('create_order', data);
  let isPrepare = /prepare\/?$/.test(req.url);
  let { plan, member_count, coupon, times, order_type } = data;
  let company_id = req.company._id;
  let user_id = req.user._id;

  let orderModel = OrderFactory.getInstance(order_type, {company_id, user_id});
  if (!orderModel) {
    next(new ApiError(400, 'invalid_order_type'));
  }

  orderModel.init(_.filter({plan, member_count, coupon, times}))
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
    return orderModel.save();
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.get('/pending', (req, res, next) => {
  BaseOrder.getPendingOrder(req.company._id)
  .then(pendingOrder => {
    res.json(pendingOrder);
  })
  .catch(next);
});

api.post('/pending/pay', (req, res, next) => {
  let data = req.body;
  validate('pay', data);
  BaseOrder.getPendingOrder(req.company._id)
  .then(order => {
    return new Plan(req.company._id).updatePaidFromOrder(order)
    .then(doc => {
      res.json(doc);
      console.log(doc);
    });
    // return Payment.pay(order, data);
  })
  .catch(next);
});
