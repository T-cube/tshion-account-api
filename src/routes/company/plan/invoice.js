import Promise from 'bluebird';
import express from 'express';
import moment from 'moment';
import { ObjectId } from 'mongodb';

import db from 'lib/database';
import C from 'lib/constants';
import { validate } from './schema';
import { ApiError } from 'lib/error';
import { getPageInfo } from 'lib/utils';

let api = express.Router();
export default api;

api.post('/', (req, res, next) => {
  let invoiceInfo = req.body;
  validate('create_invoice', invoiceInfo);
  let {address_id, order_list, title, subject} = invoiceInfo;
  if (!order_list.length) {
    throw new ApiError(400, 'invalid_order_list');
  }
  let company_id = req.company._id;
  let user_id = req.user._id;
  return Promise.all([
    db.payment.order.aggregate([
      {
        $match: {
          _id: {$in: order_list},
          company_id,
          invoice_id: {$exists: false},
          status: C.ORDER_STATUS.SUCCEED
        }
      },
      {
        $group: {
          _id: '$company_id',
          count: {$sum: 1},
          total_amount: {$sum: '$paid_sum'}
        }
      }
    ]),
    db.payment.address.findOne({
      _id: company_id,
      'list._id': address_id
    }, {
      'list.$': 1
    }),
    db.payment.invoice.count({
      company_id,
      status: C.INVOICE_STATUS.CREATING,
    })
  ])
  .then(([[orderInfo], addressInfo, creatingInvoiceCount]) => {
    if (creatingInvoiceCount) {
      throw new ApiError(400, 'exist_creating_invoice');
    }
    if (!addressInfo || !addressInfo.list.length) {
      throw new ApiError(400, 'invalid_address_id');
    }
    if (!orderInfo || orderInfo.count != order_list.length) {
      throw new ApiError(400, 'invalid_order_list');
    }
    let invoice_no = 'I' + moment().format('YYYYMMDDHHmmssSSS') + Math.random().toString().substr(2, 4);
    let data = {
      company_id,
      user_id,
      invoice_no,
      title,
      subject,
      order_list,
      address: addressInfo.list[0],
      total_amount: orderInfo.total_amount,
      tax_rate: undefined,
      status: C.INVOICE_STATUS.CREATING,
      date_create: new Date(),
      date_update: new Date(),
    };
    return db.payment.invoice.insert(data);
  })
  .then(doc => {
    res.json(doc);
    let invoice_id = doc._id;
    return db.payment.order.update({
      _id: {$in: order_list}
    }, {
      $set: {invoice_id}
    }, {
      multi: true
    })
    .then(() => {
      return db.payment.invoice.update({
        _id: invoice_id
      }, {
        $set: {status: C.INVOICE_STATUS.CREATED}
      });
    });
  })
  .catch(next);
});

api.get('/', (req, res, next) => {
  let { page, pagesize } = getPageInfo(req.query);
  let company_id = req.company._id;
  let criteria = {company_id};
  return Promise.all([
    db.payment.invoice.count(criteria),
    db.payment.invoice.find(criteria, {order_list: 0})
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

api.get('/:invoice_id', (req, res, next) => {
  let company_id = req.company._id;
  db.payment.invoice.findOne({
    company_id,
    _id: ObjectId(req.params.invoice_id)
  }, {
    order_list: 0
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.put('/:invoice_id/status', (req, res, next) => {
  let company_id = req.company._id;
  let {status} = req.body;
  if (status != C.INVOICE_STATUS.CANCELLED) {
    throw new ApiError(400, 'invalid_status');
  }
  db.payment.invoice.update({
    company_id,
    status: C.INVOICE_STATUS.CREATED,
    _id: ObjectId(req.params.invoice_id)
  }, {
    $set: {status}
  })
  .then(() => res.json({}))
  .catch(next);
});
