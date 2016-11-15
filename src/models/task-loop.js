import _ from 'underscore';
import moment from 'moment';
import Promise from 'bluebird';

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
      return Promise.all([
        this.addLoopTasks(tasks),
        this.updateTargetsNext(tasks),
      ])
      .then(() => {
        let next_last_id = tasks.length && tasks[tasks.length - 1]._id;
        if (tasks.length == this.settings.rows_fetch_once) {
          return this.doGenerateTasks(next_last_id);
        }
      });
    });
  }

  updateTargetsNext(targets) {
    return Promise.map(targets, target => {
      return TaskLoop.updateLoop(target, target.next);
    });
  }

  static getTaskNext(task, lastDate) {
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
    let nextTime = CronRule.getNextTime(rule, lastDate || new Date());
    if (loop.end && loop.end.type == 'date') {
      if (loop.end.date && loop.end.date < nextTime) {
        return null;
      }
    }
    return nextTime;
  }

  addLoopTasks(tasks) {
    let date_create = new Date();
    let newTasks = tasks.map(task => {
      let newTask = _.clone(task);
      newTask.p_id = newTask._id;
      newTask.status = C.TASK_STATUS.PROCESSING;
      newTask.date_create = date_create;
      newTask.date_update = date_create;
      newTask.date_start = moment(date_create).startOf('day').toDate();
      newTask.date_due = moment(date_create).add(1, 'd').startOf('day').toDate();
      delete newTask._id;
      delete newTask.loop;
      return newTask;
    });
    return newTasks.length && db.task.insert(newTasks);
  }

  fetchTargets(last_id) {
    let criteria = {
      'loop.next': {
        $gte: moment().startOf('day').toDate(),
        $lt: moment().add(1, 'd').startOf('day').toDate(),
      }
    };
    if (last_id) {
      criteria._id = {
        _id: {
          $gt: last_id
        }
      };
    }
    return db.task.find(criteria)
    .limit(this.settings.rows_fetch_once)
    .sort({
      _id: 1
    });
  }

  static updateLoop(task, lastDate, isInit) {
    let loopEndByTimes = task.loop.end && task.loop.end.type == 'times';
    if (loopEndByTimes && isInit) {
      task.loop.end.times += 1;
    }
    let taskNext = TaskLoop.getTaskNext(task, lastDate);
    let update;
    if (!taskNext) {
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
          'loop.next': taskNext
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
