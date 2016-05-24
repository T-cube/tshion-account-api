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
  settingValidation
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
    doc.forEach(sign => {
      signRecord.push(parseUserRecord(sign, req.attendanceSetting, year, month));
    })
    res.json(doc);
  })
})

api.post('/audit', (req, res, next) => {

})

api.get('/audit', (req, res, next) => {

})

api.get('/audit/:audit_id', (req, res, next) => {

})

api.post('/audit/:audit_id/check', (req, res, next) => {

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

function parseUserRecord(data, setting, year, month) {
  let record = {
    normal: 0,
    late: 0,
    leave_early: 0,
    workday_real: data.length,
    workday_all: 0,
    extra_work: 0,
    absent: 0,
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

class AttendanceSetting {

  constructor(setting) {
    this.setting = setting;
  }

  isWorkDay(date) {
    date = new Date(date);
    let weekday = date.getDay();
    let setting = this.setting;
    if (_.constants(setting.workday_special, date)) {
      return true;
    }
    if (_.constants(setting.holiday, date)) {
      return false;
    }
    if (setting.workday && setting.workday.length) {
      return _.constants(setting.workday, weekday);
    }
    return false;
  }

  getMonthWorkdayCount(year, month) {
    if (_.isDate(year)) {
      let date = year;
      year = date.getFullYear();
      month = date.getMonth() + 1;
    }
    let setting = req.setting;
    let now = new Date();
    let isCurrentMonth = now.getMonth() == (month - 1);
    let lastDateOfMonth = moment([year, month, 1]).subtract(1, 'day').getDate();
    let firstWeekday = moment([year, month - 1, 1]).getDay();
    let days = _.range(1, lastDateOfMonth + 1);
    days.forEach(day => {
      
    })
  }

}
