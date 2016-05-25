import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';
import moment from 'moment';

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

let api = require('express').Router();
export default api;

api.use(oauthCheck());

api.post('/sign', ensureFetchSettingOpened, (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(signSanitization, signValidation, data);
  let now = new Date();
  let date = now.getDate();
  let month = now.getMonth() + 1;
  let year = now.getFullYear();
  db.attendance.sign.findOne({
    user: req.user._id,
    year: year,
    month: month,
    'data.date': date,
  }, {
    time_start: 1,
    time_end: 1,
    'data.$.': 1
  })
  .then(doc => {
    let settings = req.attendanceSetting;
    let recordTypes = [];
    if (data.type == 'sign_in') {
      if (new Date(`${year}-${month}-${date} ${settings.time_start}`) < now) {
        recordTypes.push('late');
      }
    } else {
      if (new Date(`${year}-${month}-${date} ${settings.time_end}`) > now) {
        recordTypes.push('leave_early');
      }
    }
    if (!doc) {
      return db.attendance.sign.update({
        user: req.user._id,
        year: year,
        month: month,
      }, {
        $push: {
          data: {
            date: date,
            [data.type]: now,
            [record.type]: true,
          }
        }
      }, {
        upsert: true
      })
    } else {
      if (doc.data[0][data.type]) {
        throw new ApiError(400, null, 'user has signed')
      }
      return db.attendance.sign.update({
        user: req.user._id,
        year: year,
        month: month,
        'data.date': date,
      }, {
        $set: {
          ['data.$.' + data.type]: now,
          ['data.$.' + record.type]: true,
        }
      })
    }
  })
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
    let setting = new AttendanceSetting(req.attendanceSetting);
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

api.post('/audit/:audit_id/accept', (req, res, next) => {
  let setting = new AttendanceSetting(req.attendanceSetting);
  if (!setting.isAuditor(req.user._id)) {
    throw new ApiError(403, null, 'user is not auditor')
  }
  db.attendance.audit.findOne({
    company: req.company._id,
    _id: ObjectId(req.params.audit_id),
  })
  .then(doc => {
    if (!doc) {
      throw new ApiError(404)
    }

  })
  .catch(next)
})

api.post('/audit/:audit_id/reject', (req, res, next) => {
  let setting = new AttendanceSetting(req.attendanceSetting);
  if (!setting.isAuditor(req.user._id)) {
    throw new ApiError(403, null, 'user is not auditor')
  }
  db.attendance.audit.update({
    company: req.company._id,
    _id: ObjectId(req.params.audit_id),
  }, {
    status: C.ATTENDANCE_AUDIT_STATUS.REJECTED,
  })
  .then(doc => res.json(doc))
  .catch(next)
})

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

class AttendanceSetting {

  constructor(setting) {
    this.setting = setting;
  }

  isWorkDay(date) {
    date = new Date(date);
    let weekday = date.getDay();
    date = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
    let setting = this.setting;
    if (_.has(setting.workday_special, date)) {
      return true;
    }
    if (_.has(setting.holiday, date)) {
      return false;
    }
    if (setting.workday && setting.workday.length) {
      return _.has(setting.workday, weekday);
    }
    return false;
  }

  getMonthWorkdayCount(year, month) {
    if (_.isDate(year)) {
      let date = year;
      year = date.getFullYear();
      month = date.getMonth() + 1;
    }
    let count = 0;
    let days = this._getMonthDays(year, month);
    days.forEach(day => {
      if (this.isWorkDay(`${year}-${month}-${day}`)) {
        count += 1;
      }
    });
    return count;
  }

  getMonthWorkdayAttendCount(data, year, month) {
    if (_.isDate(year)) {
      let date = year;
      year = date.getFullYear();
      month = date.getMonth() + 1;
    }
    let count = 0;
    let days = this._getMonthDays(year, month);
    days.forEach(day => {
      if (this.isWorkDay(`${year}-${month}-${day}`) && _.find(data, item => item.date == day)) {
        count += 1;
      }
    });
    return count;
  }

  _getMonthDays(year, month) {
    let now = new Date();
    let isCurrentMonth = now.getMonth() == (month - 1);
    let lastDateOfMonth = isCurrentMonth
      ? now.getDate()
      : moment([year, month, 1]).subtract(1, 'day').getDate();
    let firstWeekday = moment([year, month - 1, 1]).toDate().getDay();
    return _.range(1, lastDateOfMonth + 1);
  }

  parseUserRecord(data, year, month) {
    let workday_all = this.getMonthWorkdayCount(year, month);
    let workday_attend = this.getMonthWorkdayAttendCount(data, year, month);
    let record = {
      normal: 0,
      late: 0,
      leave_early: 0,
      workday_real: data.length,
      workday_all: workday_all,
      extra_work: 0,
      absent: workday_all - workday_attend,
    };
    data.forEach(item => {
      if (item.late) {
        record.late += 1;
      }
      if (item.leave_early) {
        record.leave_early += 1;
      }
      if (!item.late && !item.leave_early) {
        record.normal += 1;
      }
    });
    return record;
  }

  isAuditor(user_id) {
    return this.setting.auditor && this.setting.auditor.equals(user_id);
  }
}
