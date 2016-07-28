import _ from 'underscore';
import cronParser from 'cron-parser';
import config from 'config';
import WechatApi from 'wechat-api';

import db from 'lib/database';
import C from 'lib/constants';
import wUtil from 'lib/wechat-util';

export default class Schedule {

  constructor(notification) {
    this.notification = notification;
    this.wechatApi = new WechatApi(config.get('wechat.appid'), config.get('wechat.appsecret'));
  }

  remindingJob() {
    let time = new Date();
    time.setMilliseconds(0);
    time.setSeconds(0);
    this.doRemindingJob(time, 1000);
  }

  doRemindingJob(time, limit, last_id) {
    console.log('dojob');
    console.log(time);
    limit = limit || 1;
    let condition = {
      time: time
    };
    if (last_id) {
      condition._id = {
        $gt: last_id
      };
    }
    db.reminding.find(condition)
    // .limit(limit)
    .then(list => {
      if (!list.length) {
        console.log('exit job');
        return;
      } else {
        console.log('job num: ', list.length);
      }
      let schedules = [];
      list.forEach(reminding => schedules.push(reminding.target_id));
      return db.schedule.find({
        _id: {
          $in: schedules
        }
      })
      .then(schedules => {
        return Promise.all(schedules.map(schedule => {
          this.sentMessage(schedule);
          return this.updateReminding(schedule);
        }));
      });
      // .then(() => doJob(db, time, limit, list[list.length - 1]._id))
    })
    .catch(e => {
      console.log(e);
    });
  }

  getNextRemindTime(cron_rule, repeat_end) {
    let nextRemindTime = null;
    try {
      let interval = cronParser.parseExpression(cron_rule, {
        endDate: repeat_end
      });
      nextRemindTime = interval.next().toDate();
      nextRemindTime = nextRemindTime > (new Date()) ? nextRemindTime : null;
    } catch (e) {
      console.log(e.message);
    }
    return nextRemindTime;
  }

  addReminding(schedule_id, cron_rule, repeat_end) {
    let nextRemindTime = this.getNextRemindTime(cron_rule, repeat_end);
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

  removeReminding(schedule_id) {
    return db.reminding.remove({
      target_type: 'schedule',
      target_id: schedule_id,
    });
  }

  cronRule(data) {
    let rule = data.repeat;
    let preType = data.remind;
    let info = (rule && rule.info) || null;
    let datetime = new Date(data.time_start);
    let newDatetime = this.getPreDate(datetime, preType);
    let newDate = newDatetime.getDate();
    let newMonth = newDatetime.getMonth();
    let time = [newDatetime.getHours(), newDatetime.getMinutes()];
    let preDays = newDate - datetime.getDate();

    if (typeof rule == 'string' && rule) {
      rule = rule.split(' ');
      let data = {};
      rule.length == 6 && rule.shift();
      if (rule[2] == '*') {
        if (rule[4] == '*') {
          data = {
            type: 'day'
          };
        } else {
          info = rule[4] ? rule[4].split(',') : [];
          if (preDays) {
            info = info.map(i => {
              i = (i + preDays) % 7;
              return i < 0 ? (i + 7) : i;
            });
          }
          return data = {
            type: 'weekday',
            info: info
          };
        }
      } else {
        if (rule[3] == '*') {
          data = {
            type: 'month'
          };
        } else {
          data = {
            type: 'year'
          };
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
      default:
        cron_rule = cron_rule.concat(['*', '*', '*']);
      }
      return cron_rule.length == 5 ? cron_rule.join(' ') : null;
    } else {
      return null;
    }
  }

  getPreDate(datetime, preType) {
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

  sentMessage(schedule) {
    console.log('sendMessage');
    this.notification.send({
      from: 0,
      to: schedule.creator,
      action: C.ACTIVITY_ACTION.SCHEDULE_REMIND,
      target_type: C.OBJECT_TYPE.SCHEDULE,
      schedule: schedule._id,
    });
    wUtil.getUserWechat(schedule.creator).then(wechat => {
      if (!wechat) {
        return;
      }
      let url = '';
      let data = {
        'first': {
          'value':'您好！',
          'color':'#173177'
        },
        'keyword1': {
          'value':'test',
          'color':'#173177'
        },
        'keyword2': {
          'value':'test',
          'color':'#173177'
        },
        'remark':{
          'value':'提醒',
          'color':'#173177'
        }
      };
      this.wechatApi.sendTemplate(wechat.openid, config.get('wechat.templates.reminding'), url, data);
    });
  }

  updateReminding(schedule) {
    console.log('updateReminding');
    let nextRemindTime = this.getNextRemindTime(this.cronRule(schedule), schedule.repeat_end);
    if (!nextRemindTime) {
      return this.removeReminding(schedule._id);
    }
    let reminding = {
      time: nextRemindTime,
      is_done: false,
    };
    return db.reminding.update({
      target_type: 'schedule',
      target_id: schedule._id,
    }, {
      $set: reminding
    });
  }

}
