import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';
import moment from 'moment';

import db from 'lib/database';
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
import C from 'lib/constants';
import { checkUserTypeFunc, checkUserType } from '../utils';
import {
  fetchCompanyMemberInfo,
  mapObjectIdToData,
  diffObjectId,
  indexObjectId,
  getClientIp,
  getGpsDistance,
  generateToken,
} from 'lib/utils';
import Structure from 'models/structure';
import Attendance from 'models/attendance';
import Approval from 'models/approval';
import MarsGPS from 'lib/mars-gps.js';

let api = express.Router();
export default api;

api.post('/sign', ensureFetchSettingOpened, (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(signSanitization, signValidation, data);
  checkUserLocation(req.company._id, data.location).then(isValid => {
    let from_pc = !!req.query.from_pc && !req.headers['user-agent'].toLowerCase().match(/(iphone|ipod|ipad|android)/) && getClientIp(req);
    if (!isValid && !from_pc) {
      throw new ApiError(400, 'invalid_user_location');
    }
    let now = new Date();
    _.extend(data, {
      date: now
    });
    return new Attendance(req.attendanceSetting).updateSign({
      data: [data],
      date: now,
      from_pc
    }, req.user._id, false)
    .then(record => {
      let info = {
        action: data.type == C.ATTENDANCE_SIGN_TYPE.SIGN_IN ?
          C.ACTIVITY_ACTION.SIGN_IN :
          C.ACTIVITY_ACTION.SIGN_OUT,
        target_type: C.OBJECT_TYPE.ATTENDANCE_SIGN_DATA,
        creator: req.user._id,
        company: req.company._id,
        sign_record: record[data.type]
      };
      return req.model('activity').insert(info);
    });
  })
  .then(() => res.json({}))
  .catch(next);
});

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
    throw new ApiError(400, 'forbidden');
  }
  db.attendance.sign.findOne({
    user: user_id,
    year: year,
    month: month,
    company: req.company._id,
  })
  .then(doc => {
    if (!doc) {
      doc = {
        data: [],
        year,
        month
      };
    }
    res.json(doc);
  })
  .catch(next);
});

api.get('/sign/date', (req, res, next) => {
  let date = new Date(req.query.date);
  if (!date.getTime()) {
    date = new Date();
  }
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  let day = date.getDate();
  let user_id = req.user._id;
  db.attendance.sign.findOne({
    user: user_id,
    year: year,
    month: month,
    company: req.company._id,
  })
  .then(doc => {
    let sign = doc && doc.data && _.find(doc.data, item => item.date == day);
    res.json(sign || {});
  })
  .catch(next);
});

api.get('/sign/department/:department_id', checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN), ensureFetchSetting, (req, res, next) => {
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
      return record.data.filter(item => indexObjectId(members, item.user) > -1);
    }
    return db.attendance.sign.find({
      user: {
        $in: members
      },
      year: year,
      month: month,
      company: req.company._id,
    })
    .then(doc => {
      let signRecord = [];
      let setting = new Attendance(req.attendanceSetting);
      doc.forEach(sign => {
        signRecord.push(_.extend(setting.parseUserRecord(sign.data, year, month), {
          user: sign.user
        }));
        members = diffObjectId(members, [sign.user]);
      });
      if (members.length) {
        members.forEach(user => {
          signRecord.push(_.extend(setting.parseUserRecord([], year, month), {
            user: user
          }));
        });
      }
      return signRecord;
    });
  })
  .then(record => {
    record.forEach(item => {
      item.user = _.find(req.company.members, member => member._id.equals(item.user));
      item.user = item.user && _.pick(item.user, '_id', 'name');
    });
    res.json(record);
  })
  .catch(next);
});

api.get('/sign/department/:department_id/export', checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN), (req, res, next) => {
  return generateToken(48)
  .then(token => {
    return db.attendance.export.insert({
      token,
      user: req.user._id,
      company: req.company._id,
      department_id: req.params.department_id,
    })
    .then(() => res.json({token}));
  })
  .catch(next);
});

api.put('/record', checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN), (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(recordSanitization, recordValidation, data);
  let condition = _.pick(data, 'year', 'month');
  delete data.year;
  delete data.month;
  _.extend(condition, {
    company: req.company._id,
  });
  db.attendance.record.update(condition, data, {upsert: true})
  .then(doc => res.json(_.pick(doc, '_id')))
  .catch(next);
});

api.post('/audit', (req, res, next) => {
  let data = req.body;
  let company_id = req.company._id;
  let user_id = req.user._id;
  sanitizeValidateObject(auditSanitization, auditValidation, data);

  getApprovalTpl(company_id, '_id')
  .then(template => {
    let signInData = _.find(data.data, item => item.type == C.ATTENDANCE_SIGN_TYPE.SIGN_IN);
    let signOutData = _.find(data.data, item => item.type == C.ATTENDANCE_SIGN_TYPE.SIGN_OUT);
    let item = {
      for: C.APPROVAL_TARGET.ATTENDANCE_AUDIT,
      template: template._id,
      department: '',
      content: data.reason,
      forms: [{
        _id: template.forms[0]._id,
        value: data.date,
      }, {
        _id: template.forms[1]._id,
        value: signInData ? moment(signInData.date).toDate() : '',
      }, {
        _id: template.forms[2]._id,
        value: signOutData ? moment(signOutData.date).toDate() : '',
      }],
      from: user_id,
      company_id: company_id,
      apply_date: new Date(),
      status: C.APPROVAL_ITEM_STATUS.PROCESSING,
      is_archived: false,
    };
    return Approval.createItem(item, req);
  })
  .then(() => {
    res.json({});
    return addActivity(req, C.ACTIVITY_ACTION.SIGN_AUDIT, {
      field: {
        date: data.date,
        data: data.data
      }
    });
  })
  .catch(next);
});

// api.get('/audit', (req, res, next) => {
//   db.attendance.audit.find({
//     company: req.company._id,
//   })
//
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
    _id: req.company._id
  })
  .then(doc => {
    return Promise.all([
      fetchCompanyMemberInfo(req.company, doc, 'auditor'),
      mapObjectIdToData(doc, 'approval.template', 'name,status', 'approval_template'),
    ])
    .then(() => res.json(doc || {
      is_open: true,
      time_start: '09:00',
      time_end: '18:00',
      ahead_time: 0,
      workday: [1, 2, 3, 4, 5],
      location: {
        // latitude: 39.998766,
        // longitude: 116.273938,
      },
      max_distance: 200,
      workday_special: [],
      holiday: [],
    }));
  })
  .catch(next);
});

api.put('/setting', checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN), (req, res, next) => {
  let data = req.body;
  let company_id = req.company._id;
  sanitizeValidateObject(settingSanitization, settingValidation, data);
  if (checkDupliDate(data.workday_special) || checkDupliDate(data.holiday)) {
    throw new ApiError(400, 'validation_error');
  }
  if (!_.find(req.company.members, i => i._id.equals(data.auditor))) {
    throw new ApiError(400,'member_not_exists');
  }
  db.attendance.setting.update({
    _id: company_id
  }, {
    $set: data
  }, {
    upsert: true
  })
  .then(setting => {
    res.json(setting);
    if (!data.approval_template && data.auditor) {
      return createApprovalTemplate(req, data.auditor);
    }
  })
  .catch(next);
});

function checkDupliDate(list) {
  let newList = _.clone(list);
  let dupli = false;
  list.reverse().forEach(item => {
    newList.pop();
    if (_.find(newList, i => i.date == item.date)) {
      dupli = true;
    }
  });
  return dupli;
}

function getApprovalTpl(company_id) {
  return db.attendance.setting.findOne({
    _id: company_id
  }, {
    approval_template: 1
  })
  .then(setting => {
    if (!setting || !setting.approval_template) {
      return {};
    }
    return db.approval.template.findOne({
      _id: setting.approval_template
    });
  });
}

function ensureFetchSetting(req, res, next) {
  db.attendance.setting.findOne({
    _id: req.company._id,
  })
  .then(doc => {
    if (!doc) {
      throw new ApiError(400, 'attendance_is_closed');
    }
    req.attendanceSetting = doc;
    next();
  })
  .catch(e => next(e));
}

function ensureFetchSettingOpened(req, res, next) {
  db.attendance.setting.findOne({
    _id: req.company._id,
  })
  .then(doc => {
    if (!doc || !doc.is_open) {
      throw new ApiError(400, 'attendance_is_closed');
    }
    req.attendanceSetting = doc;
    next();
  })
  .catch(e => next(e));
}

function addActivity(req, action, data) {
  let info = {
    action: action,
    target_type: C.OBJECT_TYPE.ATTENDANCE,
    creator: req.user._id,
  };
  _.extend(info, data);
  return req.model('activity').insert(info);
}

function checkUserLocation(companyId, pos) {
  if (!pos) {
    return Promise.resolve(false);
  }
  return db.attendance.setting.findOne({
    _id: companyId
  }, {
    is_open: 1,
    location: 1,
    max_distance: 1,
  })
  .then(s => {
    let accuracy = pos.accuracy;
    // pos = new MarsGPS().transform(pos);
    let distance = getGpsDistance(pos, s.location);
    if ((distance + accuracy * 0.1) <= s.max_distance) {
      return true;
    }
    return false;
  });
}

function createApprovalTemplate(req, auditor) {
  let template = {
    for: C.APPROVAL_TARGET.ATTENDANCE_AUDIT,
    forms_not_editable: true,
    name: '补签',
    description: '',
    scope: [req.company.structure._id],
    company_id: req.company._id,
    status: C.APPROVAL_STATUS.NORMAL,
    steps: [{
      _id: ObjectId(),
      approver: {
        _id: auditor,
        type: 'member',
      },
      copy_to: []
    }],
    forms: [{
      _id: ObjectId(),
      label: '补签日期',
      type: 'date',
      required: true,
    }, {
      _id: ObjectId(),
      label: '签到时间',
      type: 'datetime',
    }, {
      _id: ObjectId(),
      label: '签退时间',
      type: 'datetime',
    }],
  };
  return Approval.createTemplate(template)
  .then(template => {
    return db.attendance.setting.update({
      _id: req.company._id,
    }, {
      $set: {
        approval_template: template._id
      }
    });
  });
}
