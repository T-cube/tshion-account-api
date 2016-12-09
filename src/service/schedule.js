import _ from 'underscore';
import scheduleService from 'node-schedule';
import moment from 'moment';
import config from 'config';

import ScheduleModel from 'models/schedule';
import TaskLoop from 'models/task-loop';
import AttendanceRemind from 'models/attendance-remind';
import TaskReport from 'models/task-report';
import db from 'lib/database';
import C from 'lib/constants';

export default class ScheduleServer {

  constructor() {

  }

  init() {
    this.doJobs();
  }

  initJobs() {
    let notificationModel = this.model('notification');
    let scheduleModel = new ScheduleModel(notificationModel);
    let taskLoop = new TaskLoop({
      rows_fetch_once: 100
    });
    let attendanceRemind = new AttendanceRemind();
    let taskReport = new TaskReport();
    this.bindLoader(attendanceRemind);
    this.bindLoader(taskReport);

    this.jobs = {
      schedule_reminding: {
        init: ['*/5 * * * *', () => scheduleModel.remindingJob()]
      },
      task_loop: {
        init: ['0 0 * * *', () => taskLoop.loopJob()]
      },
      attendance_remind: {
        init: ['*/5 * * * *', () => attendanceRemind.doJob()]
      },
      task_report: {
        init: ['00 10 * * *', () => taskReport.doJob()]
      },
    };
  }

  doJobs() {
    this.initJobs();
    _.each(this.jobs, job => {
      job.worker = scheduleService.scheduleJob(...job.init);
    });
  }

}
