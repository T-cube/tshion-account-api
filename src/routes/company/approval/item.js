import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';

import { ApiError } from 'lib/error';
import { sanitizeValidateObject } from 'lib/inspector';
import { userSanitization, userValidation } from './schema';
import C, { ENUMS } from 'lib/constants';
import { oauthCheck } from 'lib/middleware';

let api = require('express').Router();
export default api;

api.use(oauthCheck());

api.post('/', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(userSanitization, userValidation, data);
  _.extend(data, {
    proposer: req.user._id,
    company_id: req.company._id,
    apply_date: new Date(),
    status: '',
    is_done: false,
    is_archived: false
  });
  db.approval.item.findOne({
    _id: data.apply_item
  })
  .then(item => {
    if (!item) {
      throw new ApiError(400);
    }
    data.steps = [];
    item.steps.forEach(step => {
      data.steps.push({
        _id: step._id,
        status: C.USER_APPROVAL_STATUS.PENDING
      })
    });
    // data.forms.forEach(form => {
    //
    // });
  })
  db.approval.user.insert(data)
  .then(doc => res.json(doc))
  .catch(next);
});

api.get('/:approval_id', (req, res, next) => {
  let approval_id = ObjectId(req.params.approval_id);
  db.approval.user.find({
    _id: approval_id
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.put('/:approval_id/steps', (req, res, next) => {
  let approval_id = ObjectId(req.params.approval_id);
  let data = req.body;
  sanitizeValidateObject(stepSanitization, stepValidation, data);

  db.approval.user.findOne({
    _id: approval_id,
  })
.then(doc => {
  let steps = doc.steps;
  let k = steps.indexOf(i => i._id == data._id);
  if (k == -1) {
    throw ApiError(400, null);
  }
})

  data.approver = req.user._id;
  db.approval.user.update({
    _id: approval_id,
    'steps._id': data._id
  }, {
    $set: {
      'steps.$.status': data.status,
      'steps.$.create_time': data.create_time,
      'steps.$.log': data.log,
    }
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.get('/archived', (req, res, next) => {
  db.approval.user.find({
    is_archived: true,
    company_id: req.company._id
  })
  .then(data => res.json(data || []))
  .catch(next);
});
