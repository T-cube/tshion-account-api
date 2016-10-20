import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';
import moment from 'moment';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import { upload, saveCdn } from 'lib/upload';
import config from 'config';
import { sanitizeValidateObject } from 'lib/inspector';
import {
  itemSanitization,
  itemValidation,
  stepSanitization,
  stepValidation,
  revokeSanitization,
  revokeValidation,
} from './schema';
import Structure from 'models/structure';
import C from 'lib/constants';
import { mapObjectIdToData, indexObjectId, fetchCompanyMemberInfo } from 'lib/utils';
import Attendance from 'models/attendance';
import Approval from 'models/approval';
import wUtil from 'lib/wechat-util';

let api = express.Router();
export default api;

api.post('/',
//upload({type: 'attachment'}).array('files'),
// TODO upload attachment;
(req, res, next) => {
  let data = req.body;
  let user_id = req.user._id;
  let company_id = req.company._id;
  sanitizeValidateObject(itemSanitization, itemValidation, data);
  if (req.files) {
    data.files = _.map(req.files, file => {
      if (config.get('upload.approval_attachment.max_file_size') < file.size) {
        throw new ApiError(400, 'file_too_large');
      }
      return _.pick(file, 'mimetype', 'url', 'path', 'relpath', 'size');
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
  let tree = new Structure(req.company.structure);
  db.approval.item.findOne({
    _id: item_id
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
        throw new ApiError(400, 'forbidden');
      }
      return db.approval.flow.findOne({
        _id: flow_id,
      })
      .then(flowInfo => {
        if (!flowInfo) {
          throw new ApiError(400, 'forbidden');
        }
        let approveInfo = _.find(flowInfo.approve, v => v._id && v._id.equals(item_id));
        let approveInfoCurStep = _.find(flowInfo.approve, v => v._id && v._id.equals(item_id) && v.step && v.step.equals(data.step));
        let inApply = indexObjectId(flowInfo.apply, item_id) != -1;
        let inCopyto = indexObjectId(flowInfo.copy_to, item_id) != -1;
        if (!inApply && !inCopyto && !approveInfo) {
          throw new ApiError(400, 'forbidden');
        }
        if (data.status == C.APPROVAL_ITEM_STATUS.PROCESSING
          && approveInfoCurStep) {
          data.is_processing = true;
        } else {
          data.is_processing = false;
        }
        data.from = _.find(req.company.members, member => member._id.equals(data.from));
        data.scope = data.scope ? data.scope.map(scope => tree.findNodeById(scope)) : [];
        data.department && (data.department = _.pick(tree.findNodeById(data.department), '_id', 'name'));
        return data;
      });
    });
  })
  .then(data => {
    return Promise.all([
      mapObjectIdToData(data, [
        ['approval.template', 'name,steps,forms,status,number', 'template'],
      ]),
      fetchCompanyMemberInfo(req.company, data, 'steps.approver')
    ])
    .then(() => data);
  })
  .then(data => {
    let { company } = req;
    data.template && data.template.steps.forEach(step => {
      if (step.approver.type == 'member') {
        _.extend(step.approver, _.pick(_.find(company.members, member => member._id.equals(step.approver._id)), 'name'));
      } else {
        _.extend(step.approver, _.pick(tree.findNodeById(step.approver._id), '_id', 'name'));
      }
      if (step.copy_to && step.copy_to.length) {
        step.copy_to.forEach(copyto => {
          if (copyto.type == 'member') {
            _.extend(copyto, _.pick(_.find(company.members, member => member._id.equals(copyto._id)), 'name'));
          } else {
            _.extend(copyto, _.pick(tree.findNodeById(copyto._id), '_id', 'name'));
          }
        });
      }
    });
    res.json(data);
  })
  .catch(next);
});

api.put('/:item_id/status', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(revokeSanitization, revokeValidation, data);
  _.extend(data, {
    step: null,
    revoke_time: new Date(),
  });
  let item_id = ObjectId(req.params.item_id);
  db.approval.item.findOne({
    _id: item_id,
    from: req.user._id,
  }, {
    status: 1,
    template: 1,
    step: 1,
  })
  .then(item => {
    if (!item || item.status != C.APPROVAL_ITEM_STATUS.PROCESSING) {
      throw new ApiError(400, 'cannot_modify');
    }
    return db.approval.item.update({
      _id: item_id,
    }, {
      $set: data
    })
    .then(() => {
      res.json({});
      return db.approval.template.findOne({
        _id: item.template
      }, {
        steps: 1
      })
      .then(template => {
        let { approver, copyto } = Approval.getStepRelatedMembers(req.company.structure, template.steps, item.step);
        return Promise.all([
          addActivity(req, C.ACTIVITY_ACTION.REVOKE, {
            approval_item: item_id,
            approval_template: item.template,
          }),
          addNotification(req, C.ACTIVITY_ACTION.REVOKE, {
            approval_item: item_id,
            approval_template: item.template,
            to: approver.concat(copyto)
          })
        ]);
      });
    });
  })
  .catch(next);
});

api.put('/:item_id/steps', (req, res, next) => {
  let item_id = ObjectId(req.params.item_id);
  let data = req.body;
  let approval_template;
  sanitizeValidateObject(stepSanitization, stepValidation, data);
  db.approval.item.findOne({
    _id: item_id,
    status: C.APPROVAL_ITEM_STATUS.PROCESSING
  })
  .then(item => {
    if (!item) {
      throw new ApiError(400, 'cannot_modify');
    }
    approval_template = item.template;
    let { step, steps } = item;
    if (!step.equals(data._id)) {
      throw new ApiError(400, 'forbidden');
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
          let isApproved = data.status != C.APPROVAL_ITEM_STATUS.REJECTED;
          let activityAction = isApproved
            ? C.ACTIVITY_ACTION.REJECT
            : C.ACTIVITY_ACTION.APPROVE;
          addNotification(req, activityAction, {
            approval_item: item_id,
            to: item.from,
            approval_template,
          });
          let url = config.get('mobileUrl') + `oa/company/${req.company._id}/feature/approval/detail/${item_id}`;
          wUtil.sendTemplateMessage(item.from, 'approval_result', url, {
            'first': {
              'value': '您好！',
              'color': '#173177'
            },
            'keyword1': {
              'value': `『${item.title}』 ${item.content}`,
              'color': '#173177'
            },
            'keyword2': {
              'value': isApproved ? '通过' : '驳回',
              'color': isApproved ? '#419641' : '#ef4f4f'
            },
            'remark': {
              'value': moment().format('YYYY/MM/DD HH:mm'),
            }
          });
          return doAfterApproval(item, data.status);
        }
      });
    });
  })
  .then(() => {
    res.json({});
    let activityAction = data.status == C.APPROVAL_ITEM_STATUS.REJECTED
      ? C.ACTIVITY_ACTION.REJECT
      : C.ACTIVITY_ACTION.APPROVE;
    return addActivity(req, activityAction, {
      approval_item: item_id,
      approval_template,
    });
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
  if (!item.for) {
    return;
  }
  switch (item.for) {
  case C.APPROVAL_TARGET.ATTENDANCE_AUDIT:
    return updateAttendance(item, status);
  }
  return;
}

function updateAttendance(item, status) {
  let { company_id, forms } = item;
  let userId = item.from;
  if (status == C.APPROVAL_ITEM_STATUS.APPROVED) {
    status = C.ATTENDANCE_AUDIT_STATUS.APPROVED;
  } else {
    status = C.ATTENDANCE_AUDIT_STATUS.REJECTED;
  }
  let data = {
    date: forms[0].value,
    sign_in: forms[1].value,
    sign_out: forms[2].value,
  };
  return Attendance.audit(company_id, userId, data, status);
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
      throw new ApiError(400, 'forbidden');
    }
    return template.steps;
  });
}
