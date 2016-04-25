import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';

import { ApiError } from 'lib/error';
import Structure from 'lib/structure';
import { sanitizeValidateObject } from 'lib/inspector';
import { sanitization, validation } from './schema';
import C from 'lib/constants';

/* company collection */
let api = require('express').Router();
export default api;

api.use((req, res, next) => {
  next();
});

api.get('/', (req, res, next) => {
  res.json(req.company.members || []);
});

api.post('/', (req, res, next) => {
  let data = req.body;
  // initial attributes
  let result = sanitizeValidateObject(sanitization, validation, data);
  if (!result.valid) {
    throw result.customError;
  }

  data._id = ObjectId();
  data.user_id = null;
  data.status = C.INVITING_STATUS.PENDING;
  db.company.update({
    _id: req.company._id,
  }, {
    $push: {members: data}
  })
  .then(doc => res.json(data))
  .catch(next);
});

api.get('/:member_id', (req, res, next) => {
  console.log('bingo');
  let data = req.body;
  let member_id = ObjectId(req.params.member_id);
  let members = req.company.members || [];
  let member = _.find(members, m => member_id.equals(m._id));
  if (!member) {
    next(ApiError(404));
  }
  res.json(member);
});

api.put('/:member_id', (req, res, next) => {
  let member_id = ObjectId(req.params.member_id);
  let data = {};
  _.each(req.body, (val, key) => {
    data['members.$.'+key] = val;
  });
  db.company.update({
    _id: req.company._id,
    'members._id': member_id
  }, {
    $set: data
  })
  .then(doc => res.json(data))
  .catch(next);
});

api.delete('/:member_id', (req, res, next) => {
  let member_id = ObjectId(req.params.member_id);
  let data = req.body;
  db.company.update({
    _id: req.company._id,
  }, {
    $pull: {members: {_id: member_id}}
  })
  .then(doc => res.json(data))
  .catch(next);
});
