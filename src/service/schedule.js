import _ from 'underscore';
import scheduleService from 'node-schedule';
import moment from 'moment';
import config from 'config';

import ScheduleModel from 'models/schedule';
import TaskLoop from 'models/task-loop';
import db from 'lib/database';
import C from 'lib/constants';
import wUtil from 'lib/wechat-util';

export default class ScheduleServer {

  constructor() {

  }

  init() {
    this.doJobs();
  }

  initJobs() {
    let notificationModel = this.model('notification');
    let scheduleModel = new ScheduleModel(notificationModel);
    let refreshWechatAccessToken = this.model('wechat-access').refresh();
    let taskLoop = new TaskLoop({
      rows_fetch_once: 100
    });

    this.jobs = {
      schedule_reminding: {
        init: ['*/5 * * * *', () => scheduleModel.remindingJob()]
      },
      task_loop: {
        init: ['0 0 * * *', () => taskLoop.generateTasks()]
      },
      wechat_access_token: {
        init: ['* */1 * * *', () => refreshWechatAccessToken()]
      }
      // task_expire: {
      //   init: ['0 9 * * *', () => {
      //     db.task.find({
      //       status: C.TASK_STATUS.PROCESSING,
      //       date_due: {
      //         $gt: new Date(moment().format('YYYY-MM-DD')),
      //         $lt: new Date(moment().add(1, 'day').format('YYYY-MM-DD')),
      //       },
      //       date_start: {
      //         $lt: new Date(moment().format('YYYY-MM-DD')),
      //       },
      //     }, {
      //       title: 1,
      //       assignee: 1,
      //       description: 1,
      //     })
      //     .then(tasks => {
      //       tasks.forEach(task => {
      //         notificationModel.send({
      //           from: 0,
      //           to: task.assignee,
      //           action: C.ACTIVITY_ACTION.SYSTEM_SET,
      //           target_type: C.OBJECT_TYPE.TASK_EXPIRE,
      //           task: task._id,
      //         }, C.NOTICE.TASK_EXPIRE);
      //         wUtil.sendTemplateMessage(task.assignee, config.get('wechat.templates.reminding'), {
      //           'first': {
      //             'value':'您好！',
      //             'color':'#173177'
      //           },
      //           'keyword1': {
      //             'value':'test',
      //             'color':'#173177'
      //           },
      //           'keyword2': {
      //             'value':'test',
      //             'color':'#173177'
      //           },
      //           'remark':{
      //             'value':'提醒',
      //             'color':'#173177'
      //           }
      //         });
      //       });
      //     })
      //     .catch(e => {
      //       console.error(e);
      //     });
      //   }]
      // }
    };
  }

  doJobs() {
    this.initJobs();
    _.each(this.jobs, job => {
      job.worker = scheduleService.scheduleJob(...job.init);
    });
  }

}
