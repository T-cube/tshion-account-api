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
  db.approval.item.insert(data)
  .then(doc => res.json(doc))
  .catch(next);
});

api.get('/:item_id', (req, res, next) => {
  let item_id = ObjectId(req.params.item_id);
  db.approval.item.find({
    _id: item_id
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.put('/:item_id/steps', (req, res, next) => {
  let item_id = ObjectId(req.params.item_id);
  let data = req.body;
  sanitizeValidateObject(stepSanitization, stepValidation, data);
  db.approval.item.findOne({
    _id: item_id,
  })
  .then(doc => {
    let { step, steps, template_id } = doc;
    if (!step.equals(data._id)) {
      throw ApiError(400, null);
    }
    let k = steps.indexOf(i => i._id.equals(data._id));
    let thisStep =  steps[k];
    let nextStep = steps[k + 1] ? steps[k + 1] : null;
    data.approver = req.user._id;
    return db.approval.item.update({
      _id: item_id,
      'steps._id': data._id
    }, {
      $set: {
        step: nextStep ? nextStep._id : null,
        'steps.$.approver': req.user._id,
        'steps.$.status': data.status,
        'steps.$.create_time': data.create_time,
        'steps.$.log': data.log,
      }
    })
  })
  .then(doc => {
    if (nextStep.approver.type)
    return db.approval.flow.update({
      
    })
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.get('/archived', (req, res, next) => {
  db.approval.item.find({
    is_archived: true,
    company_id: req.company._id
  })
  .then(data => res.json(data || []))
  .catch(next);
});

function prepareNext(req, template_id, step_id) {
  db.approval.template.findOne({
    _id: template_id
  }, {
    steps: 1
  })
  .then(doc => {
    let step = _.find(doc.steps, i => i._id.equals(step_id));
    let approver = [];
    if (step.approver.type == C.APPROVER_TYPE.DEPARTMENT) {

    }
  })
}
