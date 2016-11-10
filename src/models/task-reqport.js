import moment from 'moment';
import Promise from 'bluebird';

import C from 'lib/constants';
import db from 'lib/database';

export default class TaskReport {

  constructor() {
    this.taskFields = {
      name: 1,
      date_start: 1,
      date_due: 1,
    };
  }

  get(userId, date) {
    return Promise.all([
      this.getDateTasks(userId, date),
      this.getExpiredTasks(userId, date),
    ])
    .then(doc => {
      let [dateTasks, expiredTasks] = doc;
      return {dateTasks, expiredTasks};
    });
  }

  getExpiredTasks(userId, date) {
    return db.task.find({
      assignee: userId,
      status: C.TASK_STATUS.PROCESSING,
      date_due: {
        $lt: moment(date).startOf('day').toDate(),
      },
    }, this.taskFields);
  }

  getDateTasks(userId, date) {
    return db.task.find({
      assignee: userId,
      status: C.TASK_STATUS.PROCESSING,
      date_start: {
        $gt: moment(date).startOf('day').toDate(),
        $lt: moment(date).add(1, 'day').startOf('day').toDate(),
      },
      date_due: {
        $gte: moment(date).add(1, 'day').startOf('day').toDate(),
      },
    }, this.taskFields);
  }

}
