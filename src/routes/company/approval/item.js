import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import upload from 'lib/upload';
import config from 'config';
import { sanitizeValidateObject } from 'lib/inspector';
import { itemSanitization, itemValidation, stepSanitization, stepValidation } from './schema';
import Structure from 'models/structure';
import C from 'lib/constants';
import { mapObjectIdToData, indexObjectId } from 'lib/utils';
import Attendance from 'models/attendance';
import Approval from 'models/approval';

let api = express.Router();
export default api;

api.post('/', upload({type: 'attachment'}).array('files'), (req, res, next) => {
  let data = req.body;
  let user_id = req.user._id;
  let company_id = req.company._id;
  sanitizeValidateObject(itemSanitization, itemValidation, data);
  if (req.files) {
    data.files = _.map(req.files, file => {
      if (config.get('upload.approval_attachment.max_file_size') < file.size) {
        throw new ApiError(400, null, 'file is too large')
      }
      return _.pick(file, 'mimetype', 'url', 'path', 'relpath', 'size')
    });
  }
  _.extend(data, {
    from: user_id,
    company_id: company_id,
    apply_date: new Date(),
    status: C.APPROVAL_ITEM_STATUS.PROCESSING,
    is_archived: false,
  });
  Approval.createItem(data, req)
  .then(item => res.json(item))
  .catch(next);
});

api.get('/:item_id', (req, res, next) => {
  let item_id = ObjectId(req.params.item_id);
  db.approval.item.findOne({
    _id: item_id
  })
  .then(data => {
    return mapObjectIdToData(data, [
      ['approval.template', 'name,steps,forms,status', 'template'],
    ])
  })
  .then(data => {
    let user_id = req.user._id;
    let company_id = req.company._id;
    return db.approval.user.findOne({
      _id: user_id,
      'map.company_id': company_id
    }, {
      'map.$.flow_id': 1
    })
    .then(mapData => {
      let flow_id = mapData ? mapData.map[0].flow_id : null;
      if (!mapData || !flow_id) {
        // data.is_processing = false;
        // return res.json(data);
        throw new ApiError(400, null, 'you have not permission to read')
      }
      return db.approval.flow.findOne({
        _id: flow_id,
      })
      .then(flowInfo => {
        if (!flowInfo) {
          throw new ApiError(400, null, 'you have not permission to read')
        }
        let approveInfo = _.find(flowInfo.approve, v => v._id.equals(item_id));
        let inApply = indexObjectId(flowInfo.apply, item_id) != -1;
        let inCopyto = indexObjectId(flowInfo.copy_to, item_id) != -1;
        if (!inApply && !inCopyto && !approveInfo) {
          throw new ApiError(400, null, 'you have not permission to read')
        }
        if (data.status == C.APPROVAL_ITEM_STATUS.PROCESSING
          && approveInfo
          && approveInfo.step
          && approveInfo.step.equals(data.step)) {
          data.is_processing = true;
        } else {
          data.is_processing = false;
        }
        return data;
      })
    })
    .then(data => {
      let tree = new Structure(req.company.structure);
      data.from = _.find(req.company.members, member => member._id = data.from);
      data.steps.forEach(step => {
        if (step.approver) {
          step.approver = _.find(req.company.members, member => member._id = step.approver);
        }
      });
      data.scope = data.scope ? data.scope.map(scope => tree.findNodeById(scope)) : [];
      data.department && (data.department = _.find(tree.findNodeById(data.department), '_id', 'name'));
      res.json(data);
    })
  })
  .catch(next);
});

api.put('/:item_id/status', (req, res, next) => {
  let status = req.body.status;
  let item_id = ObjectId(req.params.item_id);
  if (status != C.APPROVAL_ITEM_STATUS.REVOKED) {
    throw new ApiError(400, null, 'wrong status');
  }
  db.approval.item.findAndModify({
    _id: item_id,
    from: req.user._id,
    status: C.APPROVAL_STATUS.PROCESSING
  }, {
    $set: {
      status: status,
      step: null
    }
  })
  .then(item => {
    if (!item || !item.value) {
      throw new ApiError(400, null, 'wrong approval status')
    }
    res.json({})
    item = item.value
    return db.approval.template.findOne({
      _id: item.template
    }, {
      steps: 1
    })
    .then(template => {
      let { approver, copyto } = Approval.getStepRelatedMembers(req.company.structure, template, item.step);
      return Promise.all([
        addActivity(req, C.ACTIVITY_ACTION.REVOKE_APPROVAL, {
          approval_item: item_id
        }),
        addNotification(req, C.ACTIVITY_ACTION.REVOKE_APPROVAL, {
          approval_item: item_id,
          to: approver.concat(copyto)
        })
      ])
    })
  })
  .catch(next);
});

api.put('/:item_id/steps', (req, res, next) => {
  let item_id = ObjectId(req.params.item_id);
  let data = req.body;
  sanitizeValidateObject(stepSanitization, stepValidation, data);
  db.approval.item.findOne({
    _id: item_id,
    status: C.APPROVAL_ITEM_STATUS.PROCESSING
  })
  .then(item => {
    if (!item) {
      throw new ApiError(400, null, 'wrong approval status');
    }
    let { step, steps } = item;
    if (!step.equals(data._id)) {
      throw new ApiError(400, null, 'you have not permission to audit');
    }
    return checkAprroverOfStepAndGetSteps(req, item)
    .then(templateSteps => {
      let k = _.findIndex(steps, item => item._id.equals(step));
      let nextStep = steps[k + 1] ? steps[k + 1] : null;
      let update = {
        step: nextStep ? nextStep._id : null,
        // log: data.log,
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
      .then(() => {
        if (nextStep && data.status == C.APPROVAL_ITEM_STATUS.APPROVED) {
          return Approval.prepareNextStep(req, item_id, templateSteps, nextStep._id);
        }
        if (!nextStep) {
          let activityAction = data.status == C.APPROVAL_ITEM_STATUS.REJECTED
            ? C.ACTIVITY_ACTION.APPROVAL_REJECTED
            : C.ACTIVITY_ACTION.APPROVAL_APPROVED;
          addNotification(req, activityAction, {
            approval_item: item_id,
            to: item.from
          });
          return doAfterApproval(item, data.status)
        }
      })
    })
  })
  .then(() => {
    res.json({})
    let activityAction = data.status == C.APPROVAL_ITEM_STATUS.REJECTED
      ? C.ACTIVITY_ACTION.APPROVAL_REJECTED
      : C.ACTIVITY_ACTION.APPROVAL_APPROVED;
    return addActivity(req, activityAction, {
      approval_item: item_id
    })
  })
  .catch(next);
});

function addActivity(req, action, data) {
  let info = {
    action: action,
    target_type: C.OBJECT_TYPE.APPROVAL_ITEM,
    creator: req.user._id,
  };
  _.extend(info, data);
  return req.model('activity').insert(info);
}

function addNotification(req, action, data) {
  let info = {
    action: action,
    target_type: C.OBJECT_TYPE.APPROVAL_ITEM,
    company: req.company._id,
    from: req.user._id,
  };
  _.extend(info, data);
  return req.model('notification').send(info);
}

function doAfterApproval(item, status) {
  if (!item.target) {
    return;
  }
  switch (item.target.type) {
    case C.APPROVAL_TARGET.ATTENDANCE_AUDIT:
      return updateAttendance(item.target._id, status);
  }
  return;
}

function updateAttendance(audit_id, status) {
  if (status == C.APPROVAL_ITEM_STATUS.APPROVED) {
    status = C.ATTENDANCE_AUDIT_STATUS.APPROVED;
  } else {
    status = C.ATTENDANCE_AUDIT_STATUS.REJECTED;
  }
  return Attendance.audit(audit_id, status)
}

function checkAprroverOfStepAndGetSteps(req, item) {
  return db.approval.template.findOne({
    _id: item.template
  }, {
    steps: 1
  })
  .then(template => {
    let { approver } = Approval.getStepRelatedMembers(req.company.structure, template.steps, item.step);
    if (-1 == indexObjectId(approver, req.user._id)) {
      throw new ApiError(400, null, 'you have not permission to audit');
    }
    return template.steps;
  })
}
