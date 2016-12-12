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

  orderModel.init({plan, member_count})
  .then(() => {
    if (coupon) {
      orderModel.withCoupon(coupon);
    }
    if (times) {
      orderModel.setTimes(times);
    }
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
    let {user_id, products, order_type, plan} = order;
    let member_count, times;
    if (_.contains([C.ORDER_TYPE.NEWLY, C.ORDER_TYPE.UPGRADE, C.ORDER_TYPE.DEGRADE], order_type)) {
      products.forEach(product => {
        if (product.product_no == 'P0002') {
          member_count = product.quantity;
        }
      });
    }
    if (_.contains([C.ORDER_TYPE.NEWLY, C.ORDER_TYPE.RENEWAL], order_type)) {
      times = order.times;
    }

    return new Plan(req.company._id).updatePaid({user_id, plan, member_count, times})
    .then(doc => {
      res.json(doc);
      console.log(doc);
    });
    // return Payment.pay(order, data);
  })
  .catch(next);
});
