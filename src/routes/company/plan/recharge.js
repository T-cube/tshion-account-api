
import express from 'express';
import { ObjectId } from 'mongodb';

import C from 'lib/constants';
import db from 'lib/database';
import { ApiError } from 'lib/error';
import { getPageInfo } from 'lib/utils';
import { validate } from './schema';
import Recharge from 'models/plan/recharge';

let api = express.Router();

export default api;

api.get('/info', (req, res, next) => {
  let user_id = req.user._id;
  let company_id = req.company._id;
  let recharge = new Recharge({company_id, user_id});
  Promise.all([
    recharge.getLimits(),
    recharge.getChargeDiscounts(),
  ])
  .then(([limits, discounts]) => {
    res.json({limits, discounts});
  })
  .catch(next);
});

api.post('/', (req, res, next) => {
  let data = req.body;
  validate('recharge', data);
  let user_id = req.user._id;
  let company_id = req.company._id;
  let recharge = new Recharge({company_id, user_id});
  recharge.create(data)
  .then(recharge => {
    console.log({recharge});
    return req.model('payment').payRecharge(recharge);
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.get('/', (req, res, next) => {
  let company_id = req.company._id;
  let { page, pagesize } = getPageInfo(req.query);
  let criteria = {company_id};
  return Promise.all([
    db.payment.recharge.count(criteria),
    db.payment.recharge.find(criteria, {
      payment_data: 0,
      payment_response: 0
    })
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

api.get('/:recharge_id/query', (req, res, next) => {
  let company_id = req.company._id;
  let recharge_id = ObjectId(req.params.recharge_id);
  return Promise.all([
    db.payment.recharge.findOne({
      _id: recharge_id,
      company_id
    }, {
      status: 1
    }),
    db.payment.charge.order.findOne({
      recharge_id,
      company_id
    })
  ])
  .then(([recharge, charge]) => {
    if (!recharge || !charge) {
      throw new ApiError(404);
    }
    if (recharge.status == C.ORDER_STATUS.SUCCEED) {
      return {ok: 1};
    }
    let {out_trade_no} = charge.payment_data;
    switch (charge.payment_method) {
    case 'wxpay':
      return req.model('payment').queryWechatOrder({
        recharge_id,
        out_trade_no,
      });
    case 'alipay':
      return req.model('payment').queryAlipayOrder({
        recharge_id,
        out_trade_no,
      });
    }
  })
  .then(({ok, trade_state}) => {
    if (ok) {
      return res.json({recharge_id, status: C.ORDER_STATUS.SUCCEED});
    }
    return res.json({recharge_id, trade_state, status: C.ORDER_STATUS.PAYING});
  })
  .catch(next);
});
