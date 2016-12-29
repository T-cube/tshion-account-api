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
import Plan from 'models/plan/plan';
import Payment from 'models/plan/payment';

import PlanOrder from 'models/plan/plan-order';

export default class ScheduleServer {

  constructor() {

  }

  init() {
    this.doJobs();
    this.recoverOrderTransaction();

    this.updateTrialPlan();
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

      update_trial_plan: {
        init: ['0 0 * * *', () => this.updateTrialPlan()]
      },

      // query_order: {
      //   init: ['*/1 * * * *', () => this.queryOrder()]
      // }
    };
  }

  doJobs() {
    this.initJobs();
    _.each(this.jobs, job => {
      job.worker = scheduleService.scheduleJob(...job.init);
    });
  }

  recoverOrderTransaction() {
    return db.transaction.find({
      order: {$exists: true},
      status: {$in: ['pending', 'commited']}
    })
    .forEach(transaction => {
      return PlanOrder.init({order_id: transaction.order})
      .then(planOrder => {
        if (transaction.payment_method == 'balance') {
          if (transaction.status == 'pending') {
            return planOrder.doPayWithBalance(transaction._id)
            .then(() => planOrder.commitTransaction(transaction._id))
            .then(() => planOrder.commitPayWithBalance(transaction._id))
            .then(() => planOrder.doneTransaction(transaction._id));
          } else {
            return planOrder.commitPayWithBalance(transaction._id)
            .then(() => planOrder.doneTransaction(transaction._id));
          }
        }
      });
    });
  }

  // 更新到期的试用
  updateTrialPlan() {
    return db.plan.company.find({
      'current.type': 'trial',
      'current.date_end': {$lte: new Date()}
    })
    .forEach(item => {
      // may send notification here
      // ...
      let planModel = new Plan(item._id);
      planModel.planInfo = item;
      planModel.cleanTrial();
    });
  }

  queryOrder() {
    return db.payment.charge.order.find({
      payment_notify: {$exists: false},
      payment_query: {$exists: false},
      date_create: {$lt: moment().subtract(2, 'minutes').toDate()}
    })
    .forEach(item => {
      new Payment().queryWechatOrder({
        order_id: item.order_id,
        out_trade_no: item.payment_data.out_trade_no
      });
    });
  }

}
