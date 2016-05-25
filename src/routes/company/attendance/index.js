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
} from './schema';
import { oauthCheck, authCheck } from 'lib/middleware';
import { mapObjectIdToData, fetchUserInfo } from 'lib/utils';
import C from 'lib/constants';
import { checkUserTypeFunc, checkUserType } from '../utils';
import Structure from 'models/structure';
import Attendance from 'models/attendance';

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
  }, req.user._id, true)
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
  db.attendance.sign.find({
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
        user: _.find(req.company.members, member => member._id.equals(sign.user))
      }))
    })
    res.json(signRecord);
  })
  .catch(next)
})

api.post('/audit', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(auditSanitization, auditValidation, data);
  _.extend(data, {
    user: req.user._id,
    company: req.company._id,
    date_create: new Date(),
    status: C.ATTENDANCE_AUDIT_STATUS.PENDING,
  })
  db.attendance.audit.insert(data)
  .then(doc => res.json(doc))
  .catch(next)
})

api.get('/audit', (req, res, next) => {
  db.attendance.audit.find({
    company: req.company._id,
  })
  .then(doc => res.json(doc))
})

api.get('/audit/:audit_id', (req, res, next) => {
  db.attendance.audit.findOne({
    company: req.company._id,
    _id: ObjectId(req.params.audit_id),
  })
  .then(doc => {
    if (!doc) {
      throw new ApiError(404)
    }
    res.json(doc)
  })
  .catch(next)
})

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
  .then(doc => res.json(doc))
  .catch(next)
})

api.put('/setting', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(settingSanitization, settingValidation, data);
  db.attendance.setting.update({
    company: req.company._id
  }, {
    $set: data
  }, {
    upsert: true
  })
  .then(doc => res.json(doc))
  .catch(next);
})

api.get('/approval-template', (req, res, next) => {
  db.attendance.setting.findOne({
    company: req.company._id
  }, {
    approval_template: 1
  })
  .then(setting => {
    if (!setting || !setting.approval_template) {
      return {};
    }
    return db.approval.template.findOne({
      _id: setting.approval_template,
      status: {
        $ne: C.APPROVAL_STATUS.DELETED
      },
    })
  })
  .then(template => res.json(template))
  .catch(next);
})

function ensureFetchSetting(req, res, next) {
  db.attendance.setting.findOne({
    company: req.company._id,
  })
  .then(doc => {
    if (!doc) {
      throw new ApiError(400, null, 'attendance is not opened');
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
      return next(new ApiError(400, null, 'attendance is not opened'));
    }
    req.attendanceSetting = doc;
    next();
  })
  .catch(() => next('route'))
}
