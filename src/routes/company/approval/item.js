import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';

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

    let update = {
      step: nextStep ? nextStep._id : null,
      'steps.$.approver': req.user._id,
      'steps.$.status': data.status,
      'steps.$.create_time': data.create_time,
      'steps.$.log': data.log,
    };
    if (!nextStep && data.status == C.USER_APPROVAL_STATUS.APPROVED) {
      update.status = C.USER_APPROVAL_STATUS.APPROVED;
    }
    if (data.status == C.USER_APPROVAL_STATUS.REJECTED) {
      update.status = C.USER_APPROVAL_STATUS.REJECTED;
    }

    return db.approval.item.update({
      _id: item_id,
      'steps._id': data._id
    }, {
      $set: update
    })
  })
  .then(doc => {
    if (nextStep && data.status == C.USER_APPROVAL_STATUS.APPROVED) {
      return prepareNext(req, item_id, template_id, nextStep._id);
    }
  })
  .then(() => res.json({}))
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

function prepareNext(req, item_id, template_id, step_id) {
  return db.approval.template.findOne({
    _id: template_id
  }, {
    steps: 1
  })
  .then(doc => {
    let step = _.find(doc.steps, i => i._id.equals(step_id));
    let approver = [];
    let copyto = [];
    if (step.approver.type == C.APPROVER_TYPE.DEPARTMENT) {
      let structure = new Structure(req.company.structure);
      approver = structure.findMemberByPosition(step.approver._id);
    } else {
      approver = [step.approver._id];
    }

    step.copy_to.forEach(i => {
      if (i.type == C.APPROVER_TYPE.DEPARTMENT) {
        let structure = new Structure(req.company.structure);
        copyto = copyto.concat(structure.findMemberByPosition(i._id));
      } else {
        copyto[] = i._id;
      }
    })

    Promise.all([
      db.approval.flow.update({
        _id: {
          $in: approver
        }
      }, {
        $push: {
          approve: item_id
        }
      }),
      db.approval.flow.update({
        _id: {
          $in: copyto
        }
      }, {
        $push: {
          copy_to: item_id
        }
      })
    ])
    .then(() => res.json({}))
    .catch(next);
  })
  .catch(next);
}
