import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';

import db from 'lib/database';
import { getPageInfo, generateToken, getClientIp } from 'lib/utils';
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
    if (!isPrepare) {
      return orderModel.save();
    }
    return Promise.all([
      orderModel.prepare(),
      orderModel.getCoupons(),
    ])
    .then(([info, coupons]) => {
      info.coupons = coupons;
      return info;
    });
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.get('/pending', (req, res, next) => {
  db.payment.order.findOne({
    company_id: req.company._id,
    status: {$in: [C.ORDER_STATUS.CREATED, C.ORDER_STATUS.PAYING]},
    date_expires: {$lt: new Date()}
  })
  .then(order => res.json(order))
  .catch(next);
});

api.post('/:order_id/pay', (req, res, next) => {
  let data = req.body;
  validate('pay', data);
  let {payment_method} = data;
  let company_id = req.company._id;
  let order_id = ObjectId(req.params.order_id);
  return PlanOrder.init(order_id, company_id)
  .then(planOrder => {
    if (!planOrder || !planOrder.isPending()) {
      throw new ApiError(400, 'invalid_order_status');
    }
    if (planOrder.get('order_type') == C.ORDER_TYPE.DEGRADE) {
      throw new ApiError(400, 'invalid request');
    }
    if (payment_method == 'balance') {
      return planOrder.payWithBalance()
      .then(() => res.json({order_id, payment_method, status: C.ORDER_STATUS.SUCCEED}));
    }
    return req.model('payment').payOrder(planOrder.order, payment_method, getClientIp(req))
    .then(data => {
      if (!data) {
        throw new ApiError(500);
      }
      res.json(data);
    });
  })
  .catch(next);
});

api.post('/:order_id/confirm', (req, res, next) => {
  let company_id = req.company._id;
  let order_id = ObjectId(req.params.order_id);
  return PlanOrder.init(order_id, company_id)
  .then(planOrder => {
    if (!planOrder || !planOrder.isPending()) {
      throw new ApiError(400, 'invalid_order_status');
    }
    if (planOrder.get('order_type') != C.ORDER_TYPE.DEGRADE) {
      throw new ApiError(400, 'invalid request');
    }
    return planOrder.prepareDegrade();
  })
  .then(() => res.json({}))
  .catch(next);
});

api.get('/', (req, res, next) => {
  let company_id = req.company._id;
  let { page, pagesize, invoice_issued } = getPageInfo(req.query);
  let criteria = {company_id};
  if (invoice_issued !== undefined) {
    criteria.status = C.ORDER_STATUS.SUCCEED;
    criteria.invoice_id = {$exists: !!invoice_issued};
  }
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
      company_id,
      status: {
        $in: [C.CHARGE_STATUS.PAYING, C.CHARGE_STATUS.SUCCEED]
      }
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

// api.get('/:order_id/token', (req, res, next) => {
//   let order_id = ObjectId(req.params.order_id);
//   let company_id = req.company._id;
//   let user_id = req.user._id;
//   return PlanOrder.init(order_id, company_id)
//   .then(planOrder => {
//     if (!planOrder) {
//       throw new ApiError(400, 'invalid_order_status');
//     }
//     return generateToken(48).then(token => {
//       let tokenKey = `pay-token-${token}`;
//       let data = {
//         token,
//         company_id: company_id.toString(),
//         order_id: order_id.toString(),
//         user_id: user_id.toString(),
//       };
//       req.model('redis').hmset(tokenKey, data);
//       req.model('redis').expire(tokenKey, 30 * 60);
//       res.json(data);
//     });
//   })
//   .catch(next);
// });
