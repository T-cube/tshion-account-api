import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';

import { ApiError } from 'lib/error';
import { sanitizeValidateObject } from 'lib/inspector';
import {
  signSanitization,
  signValidation,
  settingSanitization,
  settingValidation,
  auditSanitization,
  auditValidation,
  recordSanitization,
  recordValidation
} from './schema';
import { oauthCheck, authCheck } from 'lib/middleware';
import { mapObjectIdToData, fetchUserInfo } from 'lib/utils';
import C from 'lib/constants';
import { checkUserTypeFunc, checkUserType } from '../utils';
import Structure from 'models/structure';
import Attendance from 'models/attendance';
import Approval from 'models/approval';

let api = require('express').Router();
export default api;

api.use(oauthCheck());

api.post('/sign', ensureFetchSettingOpened, (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(signSanitization, signValidation, data);
  _.extend(data, {
    date: new Date()
  })
  new Attendance(req.attendanceSetting).updateSign({
    data: [data]
  }, req.user._id, false)
  .then(doc => res.json(doc))
  .catch(next);
})

api.get('/sign/user/:user_id', (req, res, next) => {
  let user_id = ObjectId(req.params.user_id);
  let year = parseInt(req.query.year);
  let month = parseInt(req.query.month);
  if (!year || !month) {
    let date = new Date();
    year = date.getFullYear();
    month = date.getMonth() + 1;
  }
  if (!user_id.equals(req.user._id) && !checkUserTypeFunc(req, C.COMPANY_MEMBER_TYPE.ADMIN)) {
    throw new ApiError(403)
  }
  db.attendance.sign.findOne({
    user: user_id,
    year: year,
    month: month,
  })
  .then(doc => res.json(doc))
  .catch(next)
})

api.get('/sign/department/:department_id', ensureFetchSetting, (req, res, next) => {
  let department_id = ObjectId(req.params.department_id);
  let tree = new Structure(req.company.structure);
  let members = tree.getMemberAll(department_id).map(member => member._id);
  let year = parseInt(req.query.year);
  let month = parseInt(req.query.month);
  if (!year || !month) {
    let date = new Date();
    year = date.getFullYear();
    month = date.getMonth() + 1;
  }
  db.attendance.record.findOne({
    company: req.company._id,
    year: year,
    month: month,
  })
  .then(record => {
    if (record) {
      return record.data
    }
    return db.attendance.sign.find({
      user: {
        $in: members
      },
      year: year,
      month: month,
    })
    .then(doc => {
      let signRecord = [];
      let setting = new Attendance(req.attendanceSetting);
      doc.forEach(sign => {
        signRecord.push(_.extend(setting.parseUserRecord(sign.data, year, month), {
          user: sign.user
        }))
      })
      return signRecord
    })
  })
  .then(record => {
    record.forEach(item => {
      item.user = _.find(req.company.members, member => member._id.equals(item.user))
    })
    res.json(record)
  })
  .catch(next)
})

api.post('/record', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(recordSanitization, recordValidation, data);
  _.extend(data, {
    company: req.company._id,
  })
  db.attendance.record.insert(data)
  .then(doc => res.json(_.pick(doc, '_id')))
  .catch(next)
})

api.post('/audit', (req, res, next) => {
  let data = req.body;
  let company_id = req.company._id;
  let user_id = req.user._id;
  sanitizeValidateObject(auditSanitization, auditValidation, data);
  _.extend(data, {
    user: user_id,
    company: company_id,
    date_create: new Date(),
    status: C.ATTENDANCE_AUDIT_STATUS.PENDING,
  })
  db.attendance.audit.insert(data)
  .then(audit => {
    res.json(audit)
    return getApprovalTpl(company_id, '_id')
    .then(template => {
      let signInData = _.find(audit.data, item => item.type == C.ATTENDANCE_SIGN_TYPE.SIGN_IN);
      let signOutData = _.find(audit.data, item => item.type == C.ATTENDANCE_SIGN_TYPE.SIGN_OUT);
      let item = {
        template: template._id,
        department: '',
        content: data.reason,
        forms: [{
          _id: template.forms[0]._id,
          value: audit.date,
        }, {
          _id: template.forms[1]._id,
          value: signInData ? signInData.date : '',
        }, {
          _id: template.forms[2]._id,
          value: signOutData ? signOutData.date : '',
        }],
        target: {
          type: C.APPROVAL_TARGET.ATTENDANCE_AUDIT,
          _id: audit._id,
        },
        from: user_id,
        company_id: company_id,
        apply_date: new Date(),
        status: C.APPROVAL_ITEM_STATUS.PROCESSING,
        is_archived: false,
      }
      return Approval.createItem(item, req);
    })
  })
  .catch(next)
})

// api.get('/audit', (req, res, next) => {
//   db.attendance.audit.find({
//     company: req.company._id,
//   })
//   .then(doc => res.json(doc))
// })
//
// api.get('/audit/:audit_id', (req, res, next) => {
//   db.attendance.audit.findOne({
//     company: req.company._id,
//     _id: ObjectId(req.params.audit_id),
//   })
//   .then(doc => {
//     if (!doc) {
//       throw new ApiError(404)
//     }
//     res.json(doc)
//   })
//   .catch(next)
// })

// api.post('/audit/:audit_id/accept', (req, res, next) => {
//   let setting = new Attendance(req.attendanceSetting);
//   if (!setting.isAuditor(req.user._id)) {
//     throw new ApiError(403, null, 'user is not auditor')
//   }
//   db.attendance.audit.findOne({
//     _id: ObjectId(req.params.audit_id),
//     company: req.company._id,
//     status: C.ATTENDANCE_AUDIT_STATUS.PENDING,
//   })
//   .then(doc => {
//     if (!doc) {
//       throw new ApiError(404)
//     }
//
//   })
//   .catch(next)
// })
//
// api.post('/audit/:audit_id/reject', (req, res, next) => {
//   let setting = new Attendance(req.attendanceSetting);
//   if (!setting.isAuditor(req.user._id)) {
//     throw new ApiError(403, null, 'user is not auditor')
//   }
//   db.attendance.audit.update({
//     _id: ObjectId(req.params.audit_id),
//     company: req.company._id,
//     status: C.ATTENDANCE_AUDIT_STATUS.PENDING,
//   }, {
//     status: C.ATTENDANCE_AUDIT_STATUS.REJECTED,
//   })
//   .then(doc => res.json(doc))
//   .catch(next)
// })

api.get('/setting', (req, res, next) => {
  db.attendance.setting.findOne({
    company: req.company._id
  })
  .then(doc => res.json(doc || {}))
  .catch(next)
})

api.put('/setting', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(settingSanitization, settingValidation, data);
  let company_id = req.company._id;
  // db.attendance.setting.findOne({
  //   company: company_id
  // }, {
  //   approval_template: 1
  // })
  // .then(setting => {
  //   if (!setting) {
  //     throw new ApiError(404)
  //   }
  //
  // })
  db.attendance.setting.findAndModify({
    query: {
      company: company_id
    },
    update: {
      $set: data
    }
  })
  .then(setting => {
    if (!setting || !setting.value) {
      throw new ApiError(400, null, 'attendance is closed');
    }
    res.json({})
    return db.attendance.setting.update({
      _id: setting.approval_template
    }, {
      $set: {
        'steps.$.approver': setting.auditor
      }
    })
  })
  .catch(next);
})

api.post('/setting', (req, res, next) => {
  let data = req.body;
  let company_id = req.company._id;
  sanitizeValidateObject(settingSanitization, settingValidation, data);
  _.extend(data, {
    company: company_id
  })
  db.attendance.setting.insert(data)
  .then(setting => {
    res.json(setting);
    let template = {
      name: '补签',
      description: '',
      scope: [req.company.structure._id],
      company_id: company_id,
      status: C.APPROVAL_STATUS.NORMAL,
      steps: [{
        _id: ObjectId(),
        approver: setting.auditor,
        approvar_type: 'member',
      }],
      forms: [{
        _id: ObjectId(),
        title: '补签日期',
        type: 'text',
      }, {
        _id: ObjectId(),
        title: '签到时间',
        type: 'text',
      }, {
        _id: ObjectId(),
        title: '签退时间',
        type: 'text',
      }],
    };
    return db.approval.template.insert(template)
    .then(template => {
      return db.attendance.setting.update({
        _id: setting._id
      }, {
        $set: {
          approval_template: template._id
        }
      })
    })
  })
  .catch(next);
})

api.get('/approval-template', (req, res, next) => {
  getApprovalTpl(req.company._id)
  .then(template => res.json(template))
  .catch(next);
})

function getApprovalTpl(company_id) {
  return db.attendance.setting.findOne({
    company: company_id
  }, {
    approval_template: 1
  })
  .then(setting => {
    if (!setting || !setting.approval_template) {
      return {};
    }
    return db.approval.template.findOne({
      _id: setting.approval_template
    })
  })
}

function ensureFetchSetting(req, res, next) {
  db.attendance.setting.findOne({
    company: req.company._id,
  })
  .then(doc => {
    if (!doc) {
      throw new ApiError(400, null, 'attendance is closed');
    }
    req.attendanceSetting = doc;
    next();
  })
  .catch(() => next('route'))
}

function ensureFetchSettingOpened(req, res, next) {
  db.attendance.setting.findOne({
    company: req.company._id,
  })
  .then(doc => {
    if (!doc || !doc.is_open) {
      return next(new ApiError(400, null, 'attendance is closed'));
    }
    req.attendanceSetting = doc;
    next();
  })
  .catch(() => next('route'))
}
