import Promise from 'bluebird';
import express from 'express';
import { ObjectId } from 'mongodb';

import db from 'lib/database';
import C from 'lib/constants';
import { validate } from './schema';
import { ApiError } from 'lib/error';

let api = express.Router();
export default api;

api.post('/', (req, res, next) => {
  let invoiceInfo = req.body;
  validate('create_invoice', invoiceInfo);
  let {address_id, charge_list} = invoiceInfo;
  if (!charge_list.length) {
    throw new ApiError(400, 'invalid_charge_list');
  }
  let company_id = req.company._id;
  let user_id = req.user._id;
  return Promise.all([
    db.payment.charge.order.aggregate([
      {
        $match: {
          _id: {$in: charge_list},
          company_id,
          invoice_issued: false,
          status: C.ORDER_STATUS.SUCCEED
        }
      },
      {
        $group: {
          _id: '$company_id',
          count: {$sum: 1},
          total_amount: {$sum: '$amount'}
        }
      }
    ]),
    db.payment.address.findOne({
      _id: company_id,
      'list._id': address_id
    }, {
      'list.$': 1
    }),
  ])
  .then(([[chargeOrder], addressInfo]) => {
    if (!addressInfo || !addressInfo.list.length) {
      throw new ApiError(400, 'invalid_address_id');
    }
    if (!chargeOrder || chargeOrder.count != charge_list.length) {
      throw new ApiError(400, 'invalid_charge_list');
    }
    let data = {
      company_id,
      user_id,
      charge_list,
      address: addressInfo.list[0],
      total_amount: chargeOrder.total_amount,
      tax_rate: undefined,
      status: 'created',
      date_create: new Date(),
      date_update: new Date(),
    };
    return db.payment.invoice.insert(data);
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.get('/', (req, res, next) => {

});

api.get('/pending', (req, res, next) => {

});

api.get('/:invoice_id', (req, res, next) => {

});
