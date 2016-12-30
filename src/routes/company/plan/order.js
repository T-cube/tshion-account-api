import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Qr from 'qr-image';

import db from 'lib/database';
import { getPageInfo } from 'lib/utils';
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
  if (!_.contains(ENUMS.ORDER_TYPE, order_type)) {
    throw new ApiError(400, 'invalid_order_type');
  }
  validate(`create_order_${order_type}`, data);
  let isPrepare = /prepare\/?$/.test(req.url);
  let { plan, member_count, coupon, times } = data;
  let company_id = req.company._id;
  let user_id = req.user._id;

  let orderModel = OrderFactory.getInstance(order_type, {company_id, user_id});
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

api.post('/:order_id/pay', (req, res, next) => {
  let data = req.body;
  validate('pay', data);
  let {payment_method} = data;
  let company_id = req.company._id;
  let order_id = ObjectId(req.params.order_id);
  return PlanOrder.init({company_id, order_id})
  .then(planOrder => {
    if (!planOrder) {
      throw new ApiError(400, 'invalid_order_status');
    }
    if (planOrder.get('order_type') == C.ORDER_TYPE.DEGRADE) {
      return planOrder.prepareDegrade()
      .then(() => res.json({}));
    }
    if (payment_method == 'balance') {
      return planOrder.payWithBalance()
      .then(() => res.json({order_id, payment_method, status: C.ORDER_STATUS.SUCCEED}));
    }
    return req.model('payment').payOrder(planOrder.order, payment_method)
    .then(data => {
      if (!data) {
        throw new ApiError(500);
      }
      res.json(data);
    });
  })
  .catch(next);
});

api.get('/', (req, res, next) => {
  let company_id = req.company._id;
  let { page, pagesize } = getPageInfo(req.query);
  let criteria = {company_id};
  return Promise.all([
    db.payment.order.count(criteria),
    db.payment.order.find(criteria)
    .sort({_id: -1})
    .limit(pagesize)
    .skip(pagesize * (page - 1)),
  ])
  .then(([totalrows, list]) => {
    res.json({
      page,
      pagesize,
      totalrows,
      list,
    });
  })
  .catch(next);
});

api.get('/:order_id', (req, res, next) => {
  let company_id = req.company._id;
  let order_id = ObjectId(req.params.order_id);
  return db.payment.order.findOne({
    _id: order_id,
    company_id
  })
  .then(doc => {
    if (!doc) {
      throw new ApiError(404);
    }
    return res.json(doc);
  })
  .catch(next);
});

api.get('/:order_id/query', (req, res, next) => {
  let company_id = req.company._id;
  let order_id = ObjectId(req.params.order_id);
  return Promise.all([
    db.payment.order.findOne({
      _id: order_id,
      company_id
    }, {
      status: 1
    }),
    db.payment.charge.order.findOne({
      order_id,
      company_id
    })
  ])
  .then(([order, charge]) => {
    if (!order || !charge) {
      throw new ApiError(404);
    }
    if (order.status == C.ORDER_STATUS.SUCCEED) {
      return {ok: 1};
    }
    let {out_trade_no} = charge.payment_data;
    switch (charge.payment_method) {
    case 'wxpay':
      return req.model('payment').queryWechatOrder({
        order_id,
        out_trade_no,
      });
    case 'alipay':
      return req.model('payment').queryAlipayOrder({
        order_id,
        out_trade_no,
      });
    }
  })
  .then(({ok, trade_state}) => {
    if (ok) {
      return res.json({order_id, status: C.ORDER_STATUS.SUCCEED});
    }
    return res.json({order_id, trade_state, status: C.ORDER_STATUS.PAYING});
  })
  .catch(next);
});
