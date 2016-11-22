import moment from 'moment';
import Promise from 'bluebird';

import C from 'lib/constants';
import db from 'lib/database';
import { TASK_DAYLYREPORT } from 'models/notification-setting';

export default class TaskReport {

  constructor() {
    this.taskFields = {
      title: 1,
      date_start: 1,
      date_due: 1,
    };
    this.taskItemCount = 5;
  }

  doJob() {
    this._doJob();
  }

  _doJob(last_id) {
    let criteria = last_id ? {
      _id: {
        $gt: last_id
      }
    } : {};
    db.user.findOne(criteria, {_id: 1})
    .then(user => {
      if (!user) {
        return;
      }
      return this.get(user._id)
      .then(doc => {
        doc && this.model('notification').send({
          to: user._id,
          action: C.ACTIVITY_ACTION.TASK_DAYLYREPORT,
          target_type: C.OBJECT_TYPE.TASK,
          field: doc,
        }, TASK_DAYLYREPORT);
      })
      .then(() => user._id)
      .catch(e => {
        console.error(e);
        return user._id;
      });
    })
    .then(last_id => {
      last_id && this._doJob(last_id);
    })
    .catch(e => console.error(e));
  }

  get(userId, date) {
    return Promise.all([
      this.getDateTasks(userId, date),
      this.getExpiredTasks(userId, date),
    ])
    .then(doc => {
      let [todayTasks, expiredTasks] = doc;
      if (!todayTasks.length && !expiredTasks.length) {
        return null;
      }
      return {todayTasks, expiredTasks};
    });
  }

  getExpiredTasks(userId, date) {
    return db.task.find({
      assignee: userId,
      status: C.TASK_STATUS.PROCESSING,
      date_due: {
        $lt: moment(date).startOf('day').toDate(),
      },
    }, this.taskFields)
    .limit(this.taskItemCount);
  }

  getDateTasks(userId, date) {
    return db.task.find({
      assignee: userId,
      status: C.TASK_STATUS.PROCESSING,
      date_start: {
        $gte: moment(date).startOf('day').toDate(),
        $lt: moment(date).add(1, 'day').startOf('day').toDate(),
      },
      date_due: {
        $gte: moment(date).startOf('day').toDate(),
      },
    }, this.taskFields)
    .limit(this.taskItemCount);
  }

}
