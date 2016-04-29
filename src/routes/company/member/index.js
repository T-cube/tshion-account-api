import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';

import Structure from 'models/structure';
import C from 'lib/constants';
import { ApiError } from 'lib/error';
import { sanitizeValidateObject } from 'lib/inspector';
import { sanitization, validation } from './schema';
import { checkUserType } from '../utils';

/* company collection */
let api = require('express').Router();
export default api;

api.use((req, res, next) => {
  next();
});

api.get('/', (req, res, next) => {
  res.json(req.company.members || []);
});

api.post('/', checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN), (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(sanitization, validation, data);

  db.user.findOne({email: data.email})
  .then(user => {
    let member = _.find(req.company.members, m => m._id.equals(user._id));
    if (member) {
      throw new ApiError(400, null, 'member exists');
    }
    data.status = C.INVITING_STATUS.PENDING;
    if (user) {
      // invite registered user;
      data._id = user._id;
    } else {
      // invite new user throw email;
      data._id = ObjectId();
    }
    return db.company.update({
      _id: req.company._id,
    }, {
      $push: {members: data}
    });
  })
  .then(doc => res.json(data))
  .catch(next);
});

api.get('/search', (req, res, next) => {
  let email = req.query.email;
  db.user.findOne({
    email: email
  }, {
    name: 1,
    avatar: 1,
  })
  .then(doc => {
    res.json(doc || {});
  })
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

api.put('/:member_id', checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN), (req, res, next) => {
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

api.delete('/:member_id', checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN), (req, res, next) => {
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
