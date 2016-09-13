import _ from 'underscore';
import moment from 'moment';
import Promise from 'bluebird';
import { ObjectId } from 'mongodb';

import C from 'lib/constants';
import db from 'lib/database';

export default class TaskLoop {

  constructor(opts) {
    let setting = {
      rows_fetch_once: Number.POSITIVE_INFINITY,
    };
    this.setting = _.extend(setting, opts);
  }

  generateTasks() {
    console.log('generate loop tasks', new Date());
    this.doGenerateTasks().catch(e => console.error(e));
  }

  doGenerateTasks(last_id) {
    let target_length, next_last_id, targets;
    return this.fetchTargets(last_id)
    .then(list => {
      targets = list;
      target_length = targets.length;
      next_last_id = target_length && targets[target_length - 1]._id;
      return this.fetchTasks(targets);
    })
    .then(tasks => Promise.all([
      this.addLoopTasks(tasks),
      this.updateTargetsNext(targets, tasks),
    ]))
    .then(() => {
      if (target_length == this.setting.rows_fetch_once) {
        return this.doGenerateTasks(next_last_id);
      } else {
        console.log('all tasks generated');
      }
    });
  }

  updateTargetsNext(targets, tasks) {
    return Promise.map(targets, target => {
      let task = _.find(tasks, task => task._id.equals(target.task));
      if (task) {
        return TaskLoop.updateLoop(task, target.next);
      } else {
        return db.task.loop.remove({
          _id: target._id
        });
      }
    });
  }

  static getTaskNext(task, lastDate) {
    if (!task) {
      return null;
    }
    let param;
    switch (task.loop) {
    case 'day':
      param = 'd';
      break;
    case 'weekday':
      param = 'w';
      break;
    case 'month':
      param = 'M';
      break;
    case 'year':
      param = 'y';
      break;
    default:
      return null;
    }
    return moment(lastDate || new Date()).add(1, param).toDate();
  }

  addLoopTasks(tasks) {
    let date_create = new Date();
    let newTasks = tasks.map(task => {
      let newTask = _.clone(task);
      newTask.loop_task = true;
      newTask.status = C.TASK_STATUS.PROCESSING;
      newTask.date_create = date_create;
      delete newTask._id;
      delete newTask.loop;
      return newTask;
    });
    return newTasks.length && db.task.insert(newTasks);
  }

  fetchTasks(targets) {
    return db.task.find({
      _id: {
        $in: targets.map(t => t.task)
      }
    }, {
      status: 0,
      date_create: 0,
      date_update: 0,
      date_start: 0,
      date_due: 0,
    });
  }

  fetchTargets(last_id) {
    let criteria = {
      next: {
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
    return db.task.loop.find(criteria)
    .limit(this.setting.rows_fetch_once);
  }

  static updateLoop(task, lastDate) {
    let taskNext = TaskLoop.getTaskNext(task, lastDate);
    if (!taskNext) {
      return db.task.loop.remove({
        task: task._id
      });
    }
    return db.task.loop.update({
      task: task._id
    }, {
      $set: {
        next: taskNext
      }
    }, {
      upsert: true
    });
  }

}
