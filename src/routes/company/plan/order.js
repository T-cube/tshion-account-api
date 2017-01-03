import _ from 'underscore';
import express from 'express';
import moment from 'moment';
import { ObjectId } from 'mongodb';

import db from 'lib/database';
import { getPageInfo, generateToken, timestamp } from 'lib/utils';
import C, {ENUMS} from 'lib/constants';
import { ApiError } from 'lib/error';
import { validate } from './schema';
import PlanOrder from 'models/plan/plan-order';
import OrderFactory from 'models/plan/order';

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
    if (!order) {
      throw new ApiError(404);
    }
    // 未使用第三方支付 | 支付完成
    if (!charge || order.status == C.ORDER_STATUS.SUCCEED) {
      return order.status;
    }
    let {out_trade_no} = charge.payment_data;
    return req.model('payment').query(charge.payment_method, {
      order_id,
      out_trade_no,
    });
  })
  .then(status => {
    return res.json({order_id, status});
  })
  .catch(next);
});

api.get('/:order_id/token', (req, res, next) => {
  let order_id = ObjectId(req.params.order_id);
  let company_id = req.company._id;
  let user_id = req.user._id;
  return PlanOrder.init({company_id, order_id})
  .then(planOrder => {
    if (!planOrder) {
      throw new ApiError(400, 'invalid_order_status');
    }
    return generateToken(48).then(token => {
      res.json({token});
      return db.payment.token.insert({
        _id: token,
        company_id,
        order_id,
        user_id,
        expires: moment().add(20, 'minutes').toDate(),
      });
    });
  })
  .catch(next);
});
