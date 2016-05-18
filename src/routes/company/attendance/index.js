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

let api = require('express').Router();
export default api;

api.use(oauthCheck());

api.post('/', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(sanitization, validation, data);
  let now = new Date();
  let date = now.getDate();
  let month = now.getMonth() + 1;
  let year = now.getYear();
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

api.get('/user/:user_id', (req, res, next) => {

})

api.put('/:attendance_id', (req, res, next) => {

})

api.post('/:attendance_id/check', (req, res, next) => {

})
