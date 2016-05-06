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
import { uniqObjectId, diffObjectId } from 'lib/utils';

let api = require('express').Router();
export default api;

api.use(oauthCheck());

api.post('/', (req, res, next) => {
  let data = req.body;
  let user_id = req.user._id;
  sanitizeValidateObject(itemSanitization, itemValidation, data);
  _.extend(data, {
    from: user_id,
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
      res.json(doc);
      // return upsertFlow(user_id, req.company._id)
      // .then(() => {
        return db.approval.flow.update({
          user_id: user_id,
          company_id: req.company._id
        }, {
          $addToSet: {
            apply: doc._id
          }
        }, {
          upsert: true
        })
      // })
      .then(() => {
        return prepareNextStep(req.company, doc._id, template._id, data.step)
      })
    })
  })
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

api.put('/:item_id/status', (req, res, next) => {
  let status = req.body.status;
  let item_id = ObjectId(req.params.item_id);
  if (status != C.APPROVAL_ITEM_STATUS.REVOKED) {
    throw new ApiError(400, null, 'wrong status');
  }
  db.approval.item.update({
    _id: item_id,
    from: req.user._id
  }, {
    $set: {
      status: status,
      step: null
    }
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
    status: C.APPROVAL_ITEM_STATUS.PROCESSING
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
      throw new ApiError(403, null);
    }

    let k = _.findIndex(steps, item => item._id.equals(step));
    let thisStep =  steps[k];
    let nextStep = steps[k + 1] ? steps[k + 1] : null;

    let update = {
      step: nextStep ? nextStep._id : null,
      log: data.log,
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
        return prepareNextStep(req.company, item_id, template_id, nextStep._id);
      }
    })
  })
  .then(() => res.json({}))
  .catch(next);
});

function prepareNextStep(company, item_id, template_id, step_id) {
  return db.approval.template.findOne({
    _id: template_id
  }, {
    steps: 1
  })
  .then(doc => {
    let step = _.find(doc.steps, i => i._id.equals(step_id));
    let approver = [];
    let copyto = [];
    let structure = new Structure(company.structure);

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

    copyto = uniqObjectId(copyto);
    approver = uniqObjectId(approver);
    let userList = uniqObjectId(approver.concat(copyto));
    return upsertFlow(userList, company._id)
    .then(doc => {
      return Promise.all([
        approver.length && db.approval.flow.update({
          user_id: {
            $in: approver,
          },
          company_id: company._id
        }, {
          $push: {
            approve: {
              _id: item_id,
              step: step_id
            }
          }
        }),
        copyto.length && db.approval.flow.update({
          user_id: {
            $in: copyto,
          },
          company_id: company._id
        }, {
          $push: {
            copy_to: item_id
          }
        })
      ])
    })
  })
  .catch(next);
}

function upsertFlow(userList, company_id) {
  if (!_.isArray(userList)) {
    userList = [userList];
  }
  return db.approval.flow.find({
    user_id: {
      $in: userList
    },
    company_id: company_id
  }, {
    user_id: 1
  })
  .then(existedUser => {
    let notExistedUser = diffObjectId(userList, existedUser.map(item => item.user_id));
    notExistedUser = notExistedUser.map(user_id => {
      return {
        user_id: user_id,
        company_id: company_id,
        apply: [],
        approve: [],
        copy_to: [],
      };
    });
    if (notExistedUser.length) {
      return db.approval.flow.insert(notExistedUser);
    }
  })
}
