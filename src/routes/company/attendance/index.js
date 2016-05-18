import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';

import { ApiError } from 'lib/error';
import { sanitizeValidateObject } from 'lib/inspector';
// import { } from './schema';
import { oauthCheck, authCheck } from 'lib/middleware';
import { mapObjectIdToData, fetchUserInfo } from 'lib/utils';
import config from 'config';

let api = require('express').Router();
export default api;

api.use(oauthCheck());

api.post('/', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(sanitization, validation, data);
  let date = new Date().getDate();
  db.attendance.findOne({
    user: req.user._id,
    year: data.year,
    month: data.month,
    'data.date': date,
  })
  .then(doc => {
    return db.attendance.update({
      user: req.user._id,
      year: data.year,
      month: data.month,
    }, {
      $push: {
        data: {
          date: date,
          [data.type]: new Date(),
        }
      }
    })
  })
})

api.get('/user/:user_id', (req, res, next) => {

})

api.put('/:attendance_id', (req, res, next) => {

})

api.post('/:attendance_id/check', (req, res, next) => {

})
