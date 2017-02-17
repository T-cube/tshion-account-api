import express from 'express';
import { ObjectId } from 'mongodb';

import db from 'lib/database';
import { validate } from './schema';
import { ApiError } from 'lib/error';

let api = express.Router();
export default api;

const MAX_ADDRESS_LIST_LENGTH = 10;

api.get('/', (req, res, next) => {
  db.payment.address.findOne({
    _id: req.company._id
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.post('/', (req, res, next) => {
  let address = req.body;
  validate('address', address);
  address._id = ObjectId();
  let company_id = req.company._id;
  db.payment.address.findOne({
    _id: company_id
  })
  .then(doc => {
    if (!doc) {
      return db.payment.address.insert({
        _id: company_id,
        default_address: address._id,
        list: [address]
      });
    }
    if (doc.list.length >= MAX_ADDRESS_LIST_LENGTH) {
      throw new ApiError(400);
    }
    return db.payment.address.update({
      _id: company_id
    }, {
      $push: {
        list: address
      }
    });
  })
  .then(() => res.json(address))
  .catch(next);
});

api.put('/default', (req, res, next) => {
  let data = req.body;
  validate('address_default', data);
  let {address_id} = data;
  db.payment.address.count({
    _id: req.company._id,
    'list._id': address_id
  })
  .then(count => {
    if (!count) {
      throw new ApiError(400, 'invalid_address_id');
    }
    return db.payment.address.update({
      _id: req.company._id,
    }, {
      $set: {default_address: address_id}
    });
  })
  .then(() => res.json({address_id}))
  .catch(next);
});

api.put('/:address_id', (req, res, next) => {
  let address = req.body;
  validate('address', address);
  let address_id = ObjectId(req.params.address_id);
  address._id = address_id;
  db.payment.address.update({
    _id: req.company._id,
    'list._id': address_id
  }, {
    $set: {
      'list.$': address
    }
  })
  .then(() => res.json(address))
  .catch(next);
});

api.delete('/:address_id', (req, res, next) => {
  let address_id = ObjectId(req.params.address_id);
  db.payment.address.update({
    _id: req.company._id,
  }, {
    $pull: {
      list: {
        _id: address_id
      }
    }
  })
  .then(() => res.json({address_id}))
  .catch(next);
});
