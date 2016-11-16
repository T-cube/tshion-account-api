import _ from 'underscore';
import moment from 'moment';
import Promise from 'bluebird';
import { ObjectId } from 'mongodb';

import C from 'lib/constants';
import db from 'lib/database';
import CronRule from 'lib/cron-rule';

export default class TaskLoop {

  constructor(opts) {
    let setting = {
      rows_fetch_once: Number.POSITIVE_INFINITY,
    };
    this.settings = _.extend(setting, opts);
  }

  generateTasks() {
    this.doGenerateTasks().catch(e => console.error(e));
  }

  doGenerateTasks(last_id) {
    return this.fetchTargets(last_id)
    .then(tasks => {
      if (!tasks.length) {
        return;
      }
      let next_last_id = tasks.length && tasks[tasks.length - 1]._id;
      return Promise.all([
        this.addLoopTasks(tasks),
        this.updateTargetsNextGenerateTime(tasks),
      ])
      .then(() => {
        if (next_last_id) {
          this.doGenerateTasks(next_last_id);
        }
      })
      .catch(e => console.error(e));
    });
  }

  updateTargetsNextGenerateTime(targets) {
    return Promise.map(targets, target => {
      return TaskLoop.updateLoop(target);
    });
  }

  addLoopTasks(tasks) {
    let now = moment().startOf('day').toDate();
    let newTasks = tasks.filter(task => task.loop.next >= now).map(task => {
      let newTask = _.clone(task);
      newTask.p_id = newTask._id;
      newTask.status = C.TASK_STATUS.PROCESSING;
      newTask.date_create = now;
      newTask.date_update = now;
      newTask.date_start = now;
      newTask.date_due = moment().add(1, 'd').startOf('day').toDate();
      delete newTask._id;
      delete newTask.loop;
      return newTask;
    });
    return newTasks.length && db.task.insert(newTasks);
  }

  fetchTargets(last_id) {
    let criteria = {
      'loop.next': {
        // $gte: moment().startOf('day').toDate(),
        $lt: moment().add(1, 'd').startOf('day').toDate(),
      }
    };
    if (last_id) {
      criteria._id = {
        $lt: last_id
      };
    }
    return db.task.find(criteria)
    .limit(this.settings.rows_fetch_once)
    .sort({
      _id: -1
    });
  }

  static getTaskNextGenerateTime(task) {
    let { loop } = task;
    if (!loop) {
      return null;
    }
    if (loop.end && loop.end.type == 'times') {
      if (1 >= loop.end.times) {
        return null;
      }
    }
    let rule = CronRule.transToRule(loop);
    if (!rule) {
      return null;
    }
    let nextTime = CronRule.getNextTime(rule, new Date());
    if (loop.end && loop.end.type == 'date') {
      if (loop.end.date && loop.end.date < nextTime) {
        return null;
      }
    }
    return nextTime;
  }

  static updateLoop(task, isInit) {
    let loopEndByTimes = task.loop.end && task.loop.end.type == 'times';
    if (loopEndByTimes && isInit) {
      task.loop.end.times += 1;
    }
    let nextGenerateTime = TaskLoop.getTaskNextGenerateTime(task);
    let update;
    if (!nextGenerateTime) {
      update = {
        $unset: {
          'loop.next': 1
        }
      };
      if (loopEndByTimes) {
        update['$set'] = {
          'loop.end.times': 0
        };
      }
    } else {
      update = {
        $set: {
          'loop.next': nextGenerateTime
        }
      };
      if (loopEndByTimes && !isInit) {
        update['$inc'] = {
          'loop.end.times': -1
        };
      }
    }
    return db.task.update({
      _id: task._id
    }, update);
  }

}
