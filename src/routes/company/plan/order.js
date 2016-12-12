import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';

import C from 'lib/constants';
import { ApiError } from 'lib/error';
import { validate } from './schema';
import Order from 'models/plan/order';
import Payment from 'models/plan/payment';
import OrderFactory from 'models/plan/order';

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
    return orderModel.save().then(order_id => ({order_id}));
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.get('/pending', (req, res, next) => {
  let orderModel = new Order({
    company_id: req.company._id,
    user_id: req.user._id,
  });
  orderModel.getPendingOrder()
  .then(pendingOrder => {
    res.json(pendingOrder);
  })
  .catch(next);
});

api.get('/payment', (req, res, next) => {
  let methods = new Payment().getMethods();
  res.json(methods);
});

api.post('/:orderId/pay', (req, res, next) => {
  let { payment_method } = req.body;
  let orderId = ObjectId(req.params.orderId);
  Order.pay(orderId, payment_method)
  .then(doc => res.json(doc))
  .catch(next);
});
