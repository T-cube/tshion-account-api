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
    let cursor = db.user.find();
    cursor.forEach((err, user) => {
      if (!user) {
        return;
      }
      return this.getTasks(user._id)
      .then(doc => {
        doc && this.model('notification').send({
          to: doc._id,
          action: C.ACTIVITY_ACTION.TASK_DAYLYREPORT,
          target_type: C.OBJECT_TYPE.TASK,
          field: doc,
        }, TASK_DAYLYREPORT);
      })
      .catch(e => console.error(e));
    });
  }

  getTasks(userId, date) {
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
