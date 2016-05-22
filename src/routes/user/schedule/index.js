import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';
import cronParser from 'cron-parser';
import moment from 'moment';
import scheduleService from 'node-schedule';

import { ApiError } from 'lib/error';
import { sanitizeValidateObject } from 'lib/inspector';
import { sanitization, validation } from './schema';
import { oauthCheck, authCheck } from 'lib/middleware';
import { mapObjectIdToData, fetchUserInfo } from 'lib/utils';
import config from 'config';
import C from 'lib/constants';
import notification from 'models/notification';

let api = require('express').Router();
export default api;

api.use(oauthCheck());

api.post('/', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(sanitization, validation, data);
  let repeat = data.repeat;
  let cron_rule = cronRule(repeat, data.time_start, data.remind, data.repeat.info);
  _.extend(data, {
    creator: req.user._id,
    date_create: new Date(),
    date_update: new Date(),
  })
  db.schedule.insert(data)
  .then(doc => {
    res.json(doc);
    if (data.remind != 'none') {
      addReminding(doc._id, cron_rule, data.repeat_end);
    }
  })
  .catch(next);
})

api.get([
  '/year/:year/month/:month',
  '/year/:year/month/:month/day/:day'
], (req, res, next) => {
  let { year, month, day } = req.params;
  let dateStart = new Date(`${year}-${month}-` + (day || 1));
  let dateEnd = day ? moment(dateStart).add(1, 'days').toDate() : moment(dateStart).add(1, 'months').toDate();
  if (dateStart.getFullYear() != year) {
    throw new ApiError(400);
  }
  db.schedule.find({
    creator: req.user._id,
    // time_start: {
    //   $gte: dateStart
    // },
    repeat_end: {
      $lt: dateEnd
    }
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
  let repeat = data.repeat;
  let cron_rule = cronRule(repeat, data.time_start, data.remind, data.repeat.info);
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
    return db.reminding.remove({
      target_type: 'schedule',
      target_id: schedule_id,
    })
  })
  .then(() => {
    if (data.remind != 'none') {
      return addReminding(schedule_id, cron_rule, data.repeat_end);
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
    return db.reminding.remove({
      target_type: 'schedule',
      target_id: schedule_id,
    })
  })
  .catch(next);
})

function getNextRemindTime(cron_rule, repeat_end) {
  let nextRemindTime = null;
  try {
    let interval = cronParser.parseExpression(cron_rule, {
      endDate: repeat_end
    });
    nextRemindTime = interval.next().toDate();
  } catch (e) {
    console.log(e.message);
  }
  return nextRemindTime;
}

function addReminding(schedule_id, cron_rule, repeat_end) {
  let nextRemindTime = getNextRemindTime(cron_rule, repeat_end);
  if (!nextRemindTime) {
    return null;
  }
  let reminding = {
    target_type: 'schedule',
    target_id: schedule_id,
    time: nextRemindTime,
    is_done: false,
  };
  return db.reminding.insert(reminding);
}

 function removeReminding(schedule_id) {
  return db.reminding.remove({
    target_type: 'schedule',
    target_id: schedule_id,
  })
 }

// 切换cron rule
function cronRule(rule, datetime, preType, info) {

  datetime = new Date(datetime);
  let newDatetime = getPreDate(datetime, preType);
  let oriDate = datetime.getDate();
  let oriMonth = datetime.getMonth();
  let newDate = newDatetime.getDate();
  let newMonth = newDatetime.getMonth();
  let time = [newDatetime.getHours(), newDatetime.getMinutes()];
  let preDays = newDate - oriDate;

  if (typeof rule == 'string') {
    rule = rule.split(' ');
    let data = {};
    rule.length == 6 && rulet.shift();
    if (rule[2] == '*') {
      if (rule[4] == '*') {
        data = {
          type: 'day'
        }
      } else {
        info = rule[4].split(',');
        if (preDays) {
          info = info.map(i => {
            i = (i + preDays) % 7;
            return i < 0 ? (i + 7) : i;
          });
        }
        return data = {
          type: 'weekday',
          info: info
        }
      }
    } else {
      if (rule[3] == '*') {
        data = {
          type: 'month'
        }
      } else {
        data = {
          type: 'year'
        }
      }
    }
    return data;
  } else if (_.isObject(rule)) {
    let data = rule;
    let cron_rule = time.reverse();
    switch (data.type) {
     case 'day':
       cron_rule = cron_rule.concat(['*', '*', '*']);
       break;
     case 'month':
       cron_rule = cron_rule.concat([newDate, '*', '*']);
       break;
     case 'year':
       cron_rule = cron_rule.concat([newDate, newMonth, '*']);
       break;
     case 'weekday':
       info = _.uniq(info.filter(i => /^[0-6]$/.test(i))).join(',');
       if (preDays) {
         info = info.map(i => {
           i = (i - preDays) % 7;
           return i < 0 ? (i + 7) : i;
         });
       }
       cron_rule = cron_rule.concat(['*', '*', info]);
       break;
    }
    return cron_rule.length == 5 ? cron_rule.join(' ') : null;
  } else {
    return null;
  }
}

function getPreDate(datetime, preType) {
  let newDatetime = new Date(datetime);
  switch (preType.type) {
    case 'exact':
      break;
    case 'minute':
      newDatetime -= preType.num * 60 * 1000;
      break;
    case 'hour':
      newDatetime -= preType.num * 60 * 60 * 1000;
      break;
    case 'day':
      newDatetime -= preType.num * 24 * 60 * 60 * 1000;
      break;
    case 'week':
      newDatetime -= preType.num * 7 * 24 * 60 * 60 * 1000;
      break;
  }
  return new Date(newDatetime);
}

function doJob(time, limit, last_id) {
  limit = limit || 1;
  let condition = {
    // time: {
    //   $lt: new Date()
    // },
    // is_done: false
    time: time
  }
  if (last_id) {
    condition._id = {
      $gt: last_id
    }
  }
  db.reminding.find(condition)
  .limit(limit)
  .then(list => {
    let schedules = [];
    list.forEach(reminding => schedules.push(reminding.target_id));
    db.schedule.find({
      _id: {
        $in: schedules
      }
    })
    .then(schedules => {
      return Promise.all(schedules.map(schedule => updateReminding(schedule)))
      .then(() => schedules.forEach(schedule => sentMessage(schedule)))
    })
    .then(() => doJob(time, limit, list[-1]._id))
  })
  .catch(next);
}

function sentMessage(user) {
  console.log('sentMessage');
  notification.to(schedule.creator).send({
    title: schedule.title
  });
}

function updateReminding(schedule) {
  console.log('updateReminding');
  let nextRemindTime = getNextRemindTime(cron_rule, repeat_end);
  if (!nextRemindTime) {
    return removeReminding(schedule._id);
  }
  let reminding = {
    time: nextRemindTime,
    is_done: false,
  };
  return db.reminding.update({
    target_type: 'schedule',
    target_id: schedule_id,
  }, {
    $set: reminding
  });
}

// scheduleService.scheduleJob('0,5,10,15,20,25,30,35,40,45,50,55 * * * * *', doJob(new Date(), 1000));