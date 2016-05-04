import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';

import Structure from 'models/structure';
import C, { ENUMS } from 'lib/constants';
import { ApiError } from 'lib/error';
import { sanitizeValidateObject } from 'lib/inspector';
import { sanitization, validation } from './schema';
import { time, checkUserType } from '../utils';
import { isEmail } from 'lib/utils';

/* company collection */
let api = require('express').Router();
export default api;

api.use((req, res, next) => {
  next();
});

api.get('/', (req, res, next) => {
  let memberIds = _.pluck(req.company.members, '_id');
  db.user.find({
    _id: {$in: memberIds}
  }, {
    avatar: 1,
    mobile: 1,
  })
  .then(users => {
    let members = _.map(req.company.members, member => {
      let user = _.find(user, u => u._id.equals(member._id));
      return _.extend(member, user);
    });
    res.json(members);
  });
});

api.post('/', checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN), (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(sanitization, validation, data);
  let member = _.find(req.company.members, m => m.email == data.email);
  if (member) {
    throw new ApiError(400, null, 'member exists');
  }

  db.user.findOne({email: data.email}, {_id: 1, name: 1})
  .then(user => {
    data.status = C.COMPANY_MEMBER_STATUS.PENDING;
    if (user) {
      // invite registered user;
      let member = _.find(req.company.members, m => {
        m._id.equals(user._id)
      });
      if (member) {
        throw new ApiError(400, null, 'member exists');
      }
      data._id = user._id;
    } else {
      // invite new user throw email;
      data._id = ObjectId();
    }
    db.request.insert({
      from: req.user._id,
      to: data._id,
      type: C.REQUEST_TYPE.COMPANY,
      object: req.company._id,
      status: C.REQUEST_STATUS.PENDING,
      date_create: time(),
    });
    return db.company.update({
      _id: req.company._id,
    }, {
      $push: {members: data}
    });
  })
  .then(doc => res.json(data))
  .catch(next);
});

api.post('/check', (req, res, next) => {
  let email = req.body.email;
  if (!isEmail(email)) {
    return res.json({});
  }
  let member = _.find(req.company.members, m => m.email == email);
  db.user.findOne({
    email: email
  }, {
    _id: 0,
    name: 1,
    avatar: 1,
    email: 1,
  })
  .then(doc => {
    let data = {
      is_registered: !!doc
    };
    if (doc) {
      _.extend(data, doc);
    }
    if (member) {
      data.name = member.name;
      data.is_member = true;
      data.status = member.status;
    } else {
      data.is_member = false;
    }
    res.json(data);
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
  sanitizeValidateObject(sanitization, validation, req.body);
  let data = {};
  _.each(req.body, (val, key) => {
    data['members.$.' + key] = val;
  });
  db.company.update({
    _id: req.company._id,
    'members._id': member_id
  }, {
    $set: data
  })
  .then(doc => res.json({}))
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
