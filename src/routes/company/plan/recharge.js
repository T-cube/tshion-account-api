import express from 'express';
import { ObjectId } from 'mongodb';
import _ from 'underscore';

import C from 'lib/constants';
import db from 'lib/database';
import { ApiError } from 'lib/error';
import { getPageInfo, getClientIp } from 'lib/utils';
import { validate } from './schema';
import Recharge from 'models/plan/recharge';

const api = express.Router();

export default api;

api.get('/info', (req, res, next) => {
  let user_id = req.user._id;
  let company_id = req.company._id;
  let recharge = new Recharge({company_id, user_id});
  Promise.all([
    recharge.getLimits(),
  ])
  .then(([limits]) => {
    res.json({limits});
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
    return req.model('payment').payRecharge(recharge, getClientIp(req));
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.post('/transfer', (req, res, next) => {
  let data = req.body;
  validate('transfer', data);
  let user_id = req.user._id;
  let company_id = req.company._id;
  let recharge = new Recharge({company_id, user_id});
  let payment_method = 'transfer';
  let now = new Date();
  recharge.transfer({amount: data.amount, payment_method})
  .then(recharge => {
    data.company_name = req.company.name;
    data.recharge_id = recharge._id;
    data.recharge_no = recharge.recharge_no;
    data.user_id = user_id;
    data.company_id = company_id;
    data.date_create = now;
    data.date_update = now;
    data.status = C.TRANSFER_STATUS.CREATED;
    data.operation = [{action:'create', date_create: now}];
    return db.transfer.insert(data).then(doc => {
      delete doc._id;
      res.json({...recharge,...req.body});
    });
  }).catch(next);
});

api.get('/transfer/:transfer_id', (req, res, next) => {
  validate('transfer_info', req.params, ['transfer_id']);
  db.transfer.findOne({
    company_id: req.company._id,
    _id: req.params.transfer_id
  })
  .then(doc => {
    if (!doc) {
      throw new ApiError(400, 'invalid_transfer_id');
    }
    res.json(doc);
  })
  .catch(next);
});

api.get('/transfer', (req, res, next) => {
  validate('page_info', req.query);
  let { page, pagesize } = req.query;
  let criteria = {
    company_id: req.company._id
  };
  if (!req.user._id.equals(req.company.owner)) {
    criteria.user_id = req.user._id;
  }
  db.transfer.find(criteria)
  .sort({date_create: -1})
  .skip((page - 1) * pagesize)
  .limit(pagesize)
  .then(list => {
    res.json(list);
  })
  .catch(next);
});

api.put('/transfer/:transfer_id/transfer', (req, res, next) => {
  validate('transfer_info', req.params, ['transfer_id']);
  validate('transfer_info', req.body, ['transfer_no']);
  let now = new Date();
  db.transfer.findOne({
    company_id: req.company._id,
    _id: req.params.transfer_id
  })
  .then(transfer => {
    if (!transfer || transfer.status != C.TRANSFER_STATUS.CREATED) {
      throw new ApiError(400, 'invalid_transfer');
    }
    if (!req.user._id.equals(req.company.owner) || !req.user._id.equals(transfer.user_id)) {
      throw new ApiError(400, 'invalid_user');
    }
    return db.transfer.findOneAndUpdate({
      _id: req.params.transfer_id
    }, {
      $set: {
        status: C.TRANSFER_STATUS.TRANSFERED,
        date_update: now,
        transfer_no: req.body.transfer_no,
      },
      $push: {
        operation: {action: 'transfer', date_create: now}
      }
    }, {
      returnOriginal: false,
      returnNewDocument: true
    })
    .then(doc => {
      res.json(doc.value);
    });
  })
  .catch(next);
});

api.delete('/transfer/:transfer_id/cancel', (req, res, next) => {
  validate('transfer_info', req.params, ['transfer_id']);
  db.transfer.findOne({
    _id: req.params.transfer_id,
    company_id: req.company._id,
  })
  .then(transfer => {
    if (!transfer || !_.some([C.TRANSFER_STATUS.TRANSFERED,C.TRANSFER_STATUS.CREATED], item => item == transfer.status)) {
      throw new ApiError(400, 'invalid_transfer');
    }
    if (!req.user._id.equals(req.company.owner) || !req.user._id.equals(transfer.user_id)) {
      throw new ApiError(400, 'invalid_user');
    }
    let now = new Date();
    return db.transfer.findOneAndUpdate({
      _id: req.params.transfer_id
    }, {
      $set: {
        status: C.TRANSFER_STATUS.CANCELLED,
        date_update: now,
      },
      $push: {
        operation: {action: 'cancel', date_create: now}
      }
    }, {
      returnOriginal: false,
      returnNewDocument: true
    })
    .then(doc => {
      res.json(doc.value);
    });
  })
  .catch(next);
});

api.get('/', (req, res, next) => {
  let company_id = req.company._id;
  let { page, pagesize } = getPageInfo(req.query);
  let criteria = {
    company_id,
    $or: [
      {status: C.ORDER_STATUS.SUCCEED},
      {date_expires: {$gt: new Date()}}
    ]
  };
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
      return C.ORDER_STATUS.SUCCEED;
    }
    let {out_trade_no} = charge.payment_data;
    return req.model('payment').query(charge.payment_method, {
      recharge_id,
      out_trade_no,
    });
  })
  .then(status => {
    return res.json({recharge_id, status});
  })
  .catch(next);
});
