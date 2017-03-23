import _ from 'underscore';
import cronParser from 'cron-parser';
import moment from 'moment';
import scheduleService from 'node-schedule';

import db from 'lib/database';
import C from 'lib/constants';
import { SCHEDULE_REMIND } from 'models/notification-setting';

export default class Schedule {

  constructor(notification) {
    this.notification = notification;
  }

  remindingJob() {
    let criteria = {
      time: {
        $gte: moment().startOf('minute').toDate(),
        $lt: moment().add(5, 'minute').startOf('minute').toDate(),
      }
    };
    db.reminding.find(criteria)
    .forEach((err, reminding) => {
      if (!reminding) {
        if (err) {
          console.error(err);
        }
        return;
      }
      return db.schedule.find({
        _id: reminding.target_id
      })
      .then(schedule => {
        this.sentMessage(schedule, schedule.time_start);
        return this.updateReminding(schedule);
      })
      .catch(e => console.error(e));
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
      console.error(e.message);
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

  sentMessage(schedule, remind_time) {
    this.notification.send({
      from: 0,
      to: schedule.creator,
      action: C.ACTIVITY_ACTION.SCHEDULE_REMIND,
      target_type: C.OBJECT_TYPE.SCHEDULE,
      schedule: schedule._id,
      remind_time,
    }, SCHEDULE_REMIND);
  }

  updateReminding(schedule) {
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

  expireOrderSchedule(date, order_no) {
    scheduleService.scheduleJob(date, () => {
      this.expireOrder(order_no);
    });
  }

  expireOrder(order_no) {
    db.payment.order.findOne({order_no}).then(doc => {
      db.order.coupon.remove({order_no});
      if (doc.status == 'created' || doc.status == 'paying') {
        if (doc.coupon_serial_no) {
          db.payment.coupon.item.update({
            serial_no: doc.coupon_serial_no
          }, {
            $set: {
              is_used: false
            }
          });
        }
        db.payment.order.update({order_no},{$set: {status: C.ORDER_STATUS.EXPIRED}});
      }
    });
  }

}
