import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';

import { ApiError } from 'lib/error';
import { sanitizeValidateObject } from 'lib/inspector';
import { sanitization, validation } from './schema';
import { oauthCheck, authCheck } from 'lib/middleware';
import { mapObjectIdToData, fetchUserInfo } from 'lib/utils';
import config from 'config';
import C from 'lib/constants';
import { checkUserTypeFunc, checkUserType } from '../utils';
import Structure from 'models/structure';

let api = require('express').Router();
export default api;

api.use(oauthCheck());

api.post('/sign', ensureFetchSettingOpened, (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(sanitization, validation, data);
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
    'data.$.': 1
  })
  .then(doc => {
    console.log(doc);
    let settings = req.attendenceSetting;
    let record = {};
    if (data.type == 'sign_in') {
      if (new Date(`${year}-${month}-${date} ${settings.time_start}`) < now) {
        record.late = true;
      }
    } else {
      if (new Date(`${year}-${month}-${date} ${settings.time_end}`) > now) {
        record.leave_early = true;
      }
    }
    if (!doc) {
      return db.attendance.sign.update({
        user: req.user._id,
        year: year,
        month: month,
      }, {
        $push: {
          data: _.extend(record, {
            date: date,
            [data.type]: now,
          })
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
        $set: _.extend(record, {
          ['data.$.' + data.type]: now
        })
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

api.get('/sign/department/:department_id', (req, res, next) => {
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
    let signData = [];
    doc.forEach(sign => {

    })
    console.log(doc);
  })
})

api.post('/audit', (req, res, next) => {

})

api.post('/audit/:audit_id/check', (req, res, next) => {

})

function ensureFetchSetting(req, res, next) {
  db.attendence.setting.findOne({
    company: req.company._id,
  })
  .then(doc => {
    if (!doc) {
      throw new ApiError(400, null, 'attendence is not opened');
    }
    req.attendenceSetting = doc;
    next();
  })
  .catch(() => next('route'))
}

function ensureFetchSettingOpened(req, res, next) {
  db.attendence.setting.findOne({
    company: req.company._id,
  })
  .then(doc => {
    if (!doc || !doc.is_open) {
      throw new ApiError(400, null, 'attendence is not opened');
    }
    req.attendenceSetting = doc;
    next();
  })
  .catch(() => next('route'))
}
