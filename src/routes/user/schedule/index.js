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

let api = require('express').Router();
export default api;

api.use(oauthCheck());

api.post('/', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(sanitization, validation, data);
  _.extend(data, {
    creator: req.user._id,
    date_create: new Date(),
    date_update: new Date(),
  })
  db.schedule.insert(data)
  .then(doc => {

    let reminding = [];
    return db.reminding.insert(reminding);
    res.json(doc);
  })
  .catch(next)
})

api.get([
  '/year/:year/month/:month',
  '/year/:year/month/:month/day/:day'
], (req, res, next) => {
  let criteria = {
    user: req.user._id,
  };
  let { year, month, day } = req.params;
  if (day) {
    criteria.date_from = {
      $lt: `${year}-${month}-${day}`
    }
  } else {
    criteria.date_from = {
      $lt: `${year}-${month}-1`
    }
  }
  db.schedule.find(criteria)
  .then(doc => res.json(doc))
  .catch(next);
})

api.get('/:schedule_id', (req, res, next) => {
  let schedule_id = ObjectId(req.params.schedule_id);
  db.schedule.findOne({
    _id: schedule_id,
    user: req.user._id,
  })
  .then(doc => res.json(doc))
  .catch(next);
})

api.put('/:schedule_id', (req, res, next) => {
  let schedule_id = ObjectId(req.params.schedule_id);
  let data = req.body;
  sanitizeValidateObject(sanitization, validation, data);
  _.extend(data, {
    date_update: new Date(),
  })
  db.schedule.update({
    _id: schedule_id,
    user: req.user._id,
  }, {
    $set: data
  })
  .then(doc => rs.json(doc))
  .catch(next);
})

api.delete('/:schedule_id', (req, res, next) => {
  let schedule_id = ObjectId(req.params.schedule_id);
  db.schedule.delete({
    _id: schedule_id,
    user: req.user._id,
  })
  .then(doc => rs.json(doc))
  .catch(next);
})
