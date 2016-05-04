import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';

import { ApiError } from 'lib/error';
import { sanitizeValidateObject } from 'lib/inspector';
import { itemSanitization, itemValidation, stepSanitization, stepValidation } from './schema';
import Structure from 'models/structure';
import C from 'lib/constants';
import { oauthCheck } from 'lib/middleware';

let api = require('express').Router();
export default api;

api.use(oauthCheck());

api.post('/', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(itemSanitization, itemValidation, data);
  _.extend(data, {
    from: req.user._id,
    company_id: req.company._id,
    apply_date: new Date(),
    status: C.APPROVAL_ITEM_STATUS.PROCESSING,
    is_archived: false,
  });
  db.approval.template.findOne({
    _id: data.template_id
  })
  .then(template => {
    if (!template) {
      throw new ApiError(400, null, 'approval template is not existed');
    }
    data.step = template.steps[0] ? template.steps[0]._id : null;
    data.steps = [];
    template.steps.forEach(step => {
      data.steps.push({
        _id: step._id,
        status: C.APPROVAL_ITEM_STATUS.PROCESSING
      })
    });
    // data.forms.forEach(form => {
    //
    // });
    return db.approval.item.insert(data)
    .then(doc => {
      
    })
  })
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
  }, {
    step: 1,
    steps: 1,
    template_id: 1,
  })
  .then(doc => {
    if (!doc) {
      throw new ApiError(400);
    }
    let { step, steps, template_id } = doc;
    if (!step.equals(data._id)) {
      throw ApiError(400, null);
    }
    let k = steps.indexOf(i => i._id.equals(data._id));
    let thisStep =  steps[k];
    let nextStep = steps[k + 1] ? steps[k + 1] : null;

    let update = {
      step: nextStep ? nextStep._id : null,
      'steps.$.approver': req.user._id,
      'steps.$.status': data.status,
      'steps.$.create_time': new Date(),
      'steps.$.log': data.log,
    };
    if (!nextStep && data.status == C.APPROVAL_ITEM_STATUS.APPROVED) {
      update.status = C.APPROVAL_ITEM_STATUS.APPROVED;
    }
    if (data.status == C.APPROVAL_ITEM_STATUS.REJECTED) {
      update.status = C.APPROVAL_ITEM_STATUS.REJECTED;
    }

    return db.approval.item.update({
      _id: item_id,
      'steps._id': data._id
    }, {
      $set: update
    })
    .then(doc => {
      if (nextStep && data.status == C.APPROVAL_ITEM_STATUS.APPROVED) {
        return prepareNextStep(req.company.structure, item_id, template_id, nextStep._id);
      }
    })
  })
  .then(() => res.json({}))
  .catch(next);
});

function prepareNextStep(structure, item_id, template_id, step_id) {
  return db.approval.template.findOne({
    _id: template_id
  }, {
    steps: 1
  })
  .then(doc => {
    let step = _.find(doc.steps, i => i._id.equals(step_id));
    let approver = [];
    let copyto = [];
    structure = new Structure(structure);

    if (step.approver.type == C.APPROVER_TYPE.DEPARTMENT) {
      approver = structure.findMemberByPosition(step.approver._id);
    } else {
      approver = [step.approver._id];
    }

    step.copy_to.forEach(i => {
      if (i.type == C.APPROVER_TYPE.DEPARTMENT) {
        copyto = copyto.concat(structure.findMemberByPosition(i._id));
      } else {
        copyto = copyto.concat(i._id);
      }
    });

    return Promise.all([
      approver.length && db.approval.flow.update({
        _id: {
          $in: approver
        }
      }, {
        $push: {
          approve: item_id
        }
      }),
      copyto.length && db.approval.flow.update({
        _id: {
          $in: copyto
        }
      }, {
        $push: {
          copy_to: item_id
        }
      })
    ])
  })
}
