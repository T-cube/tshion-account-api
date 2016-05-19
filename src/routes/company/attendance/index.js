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

let api = require('express').Router();
export default api;

api.use(oauthCheck());

api.post('/', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(sanitization, validation, data);
  let now = new Date();
  let date = now.getDate();
  let month = now.getMonth() + 1;
  let year = now.getFullYear();
  db.attendance.findOne({
    user: req.user._id,
    year: year,
    month: month,
    'data.date': date,
  }, {
    'data.$.': 1
  })
  .then(doc => {
    if (!doc) {
      return db.attendance.update({
        user: req.user._id,
        year: year,
        month: month,
      }, {
        $push: {
          data: {
            date: date,
            [data.type]: new Date(),
          }
        }
      }, {
        upsert: true
      })
    } else {
      if (doc.data[0][data.type]) {
        throw new ApiError(400, null, 'user has signed')
      }
      return db.attendance.update({
        user: req.user._id,
        year: year,
        month: month,
        'data.date': date,
      }, {
        $set: {
          ['data.$.' + data.type]: new Date()
        }
      })
    }
  })
  .then(doc => res.json(doc))
  .catch(next);
})

api.get('/user/:user_id/year/:year/month/:month', (req, res, next) => {
  let user_id = ObjectId(req.params.user_id);
  if (!user_id.equals(req.user._id) && !checkUserTypeFunc(req, C.COMPANY_MEMBER_TYPE.ADMIN)) {
    throw new ApiError(403)
  }
  db.attendance.findOne({
    user: user_id,
    year: parseInt(req.params.year),
    month: parseInt(req.params.month),
  })
  .then(doc => res.json(doc))
  .catch(next)
})

api.get('/deppartment/:department_id', (req, res, next) => {
  let department_id = ObjectId(req.params.department_id);
  db.attendance.find()
})

api.post('/audit', (req, res, next) => {

})

api.post('/audit/:audit_id/check', (req, res, next) => {

})
