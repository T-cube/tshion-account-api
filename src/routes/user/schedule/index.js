import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';
import moment from 'moment';

import { ApiError } from 'lib/error';
import { sanitizeValidateObject } from 'lib/inspector';
import { sanitization, validation } from './schema';
import { oauthCheck, authCheck } from 'lib/middleware';
import { mapObjectIdToData, fetchUserInfo } from 'lib/utils';
import C from 'lib/constants';
import ScheduleModel from 'models/schedule';

let api = require('express').Router();
export default api;

api.use(oauthCheck());

api.post('/', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(sanitization, validation, data);
  let scheduleModel = new ScheduleModel(db);
  let cron_rule = scheduleModel.cronRule(data);
  _.extend(data, {
    creator: req.user._id,
    date_create: new Date(),
    date_update: new Date(),
  })
  db.schedule.insert(data)
  .then(doc => {
    res.json(doc);
    if (data.remind != 'none') {
      return scheduleModel.addReminding(doc._id, cron_rule, data.repeat_end);
    }
  })
  .catch(next);
})

api.get([
  '/year/:year',
  '/year/:year/month/:month',
  '/year/:year/month/:month/day/:day'
], (req, res, next) => {
  let { year, month, day } = req.params;
  let dateStart = new Date(`${year}-` + (month || 1) + '-' + (day || 1));
  if (dateStart.getFullYear() != year) {
    throw new ApiError(400);
  }
  let dateEnd;
  if (!month) {
    dateEnd = moment(dateStart).add(1, 'year').toDate();
  } else {
    dateEnd = day
     ? moment(dateStart).add(1, 'day').toDate()
     : moment(dateStart).add(1, 'month').toDate();
  }
  db.schedule.find({
    creator: req.user._id,
    time_start: {
      $lte: dateEnd
    },
    $or: [{
      repeat_end: {
        $gte: dateStart
      }
    }, {
      time_end: {
        $gte: dateStart
      }
    }]
  })
  .then(doc => res.json(doc))
  .catch(next);
})

api.get('/:schedule_id', (req, res, next) => {
  let schedule_id = ObjectId(req.params.schedule_id);
  db.schedule.findOne({
    _id: schedule_id,
    creator: req.user._id,
  })
  .then(doc => res.json(doc))
  .catch(next);
})

api.put('/:schedule_id', (req, res, next) => {
  let schedule_id = ObjectId(req.params.schedule_id);
  let data = req.body;
  sanitizeValidateObject(sanitization, validation, data);
  let scheduleModel = new ScheduleModel(db);
  let cron_rule = scheduleModel.cronRule(data);
  console.log(cron_rule);
  _.extend(data, {
    date_update: new Date(),
  })
  delete data.repeat;
  db.schedule.update({
    _id: schedule_id,
    creator: req.user._id,
  }, {
    $set: data
  })
  .then(doc => {
    res.json(doc);
    return scheduleModel.removeReminding(schedule_id)
  })
  .then(() => {
    if (data.remind != 'none') {
      return scheduleModel.addReminding(schedule_id, cron_rule, data.repeat_end);
    }
  })
  .catch(next);
})

api.delete('/:schedule_id', (req, res, next) => {
  let schedule_id = ObjectId(req.params.schedule_id);
  db.schedule.remove({
    _id: schedule_id,
    creator: req.user._id,
  })
  .then(doc => {
    res.json(doc);
    return new ScheduleModel(db).removeReminding(schedule_id)
  })
  .catch(next);
})
