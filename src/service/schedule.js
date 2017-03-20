import _ from 'underscore';
import scheduleService from 'node-schedule';

import C from 'lib/constants';
import ScheduleModel from 'models/schedule';
import TaskLoop from 'models/task-loop';
import AttendanceRemind from 'models/attendance-remind';
import TaskReport from 'models/task-report';
import db from 'lib/database';
import Plan from 'models/plan/plan';
import TransactionRecover from 'models/plan/transaction-recover';
import PlanOrder from 'models/plan/plan-order';
import OrderFactory from 'models/plan/order';


export default class ScheduleServer {

  constructor() {}

  init() {
    this.doJobs();
    this.recoverTransaction();
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
        init: ['*/1 * * * *', () => taskLoop.loopJob()]
      },
      attendance_remind: {
        init: ['*/5 * * * *', () => attendanceRemind.doJob()]
      },
      task_report: {
        init: ['0 10 * * *', () => taskReport.doJob()]
      },

      update_trial_plan: {
        init: ['0 0 * * *', () => this.updateTrialPlan()]
      },

      plan_degrade: {
        init: ['0 0 * * *', () => this.doDegrade()]
      },

      auto_renewal: {
        init: ['0 0 * * *', () => this.autoRenewal()]
      },

    };
  }

  doJobs() {
    this.initJobs();
    _.each(this.jobs, job => {
      job.worker = scheduleService.scheduleJob(...job.init);
    });
  }

  recoverTransaction() {
    TransactionRecover.orderPaySuccess();
    TransactionRecover.rechargePaySuccess();
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

  // 自动续费
  autoRenewal() {
    return db.plan.company.find({
      'current.type': 'paid',
      'current.date_end': {$lte: new Date()},
      auto_renewal: true
    })
    .forEach(item => {

      console.log('auto_renewal', {item});
      let order_type = C.ORDER_TYPE.RENEWAL;
      let times = 1;
      let { plan, member_count } = _.find(item.list, i => i._id.equals(item.current._id));
      let company_id = item._id;
      let user_id = null;

      OrderFactory.getInstance({
        order_type,
        company_id,
        user_id,
        plan,
        member_count,
        times,
      })
      .then(orderModel => orderModel.save())
      .then(order => {
        return PlanOrder.init(order._id)
        .then(planOrder => planOrder.payWithBalance())
        .then(() => {
          // send notification here
          console.log('auto renewal pay with balance succeed');
        });
      })
      .catch(e => {
        console.log('auto renewal pay with balance failed');
        console.error(e);
        // send notification here
        if (e.message == 'balance_insufficient') {
          // balance_insufficient
        }
      });
    });
  }

  doDegrade() {
    return db.plan.company.find({
      'degrade.time': {$lte: new Date()}
    }, {
      degrade: 1
    })
    .forEach(item => {
      // may send notification here
      // ...
      let order_id = item.degrade.order._id;
      return db.payment.order.findOne({
        _id: order_id
      })
      .then(order => {
        if (!order) {
          return;
        }
        let planModel = new Plan(order.company_id);
        return Promise.all([
          planModel.updatePaidFromOrder(order),
          planModel.clearDegrade(),
        ]);
      });
    });
  }

}
