import _ from 'underscore';
import Promise from 'bluebird';
import moment from 'moment';
import config from 'config';

import { ApiError } from 'lib/error';
import C from 'lib/constants';
import db from 'lib/database';
import Auth from './auth';


export default class Plan {

  constructor(company_id) {
    this.company_id = company_id;
  }

  getStatus() {
    let { company_id } = this;
    return Promise.all([
      db.plan.company.find({company_id}),
      new Auth(company_id).getAuthedPlan()
    ])
    .then(([history, authed]) => {
      let paid = _.values(C.TEAMPLAN_PAID);
      let trial = paid.filter(item => -1 == history.map(h => h.plan).indexOf(item));
      let current = this._getCurrent(history.filter(item => item.status == C.PLAN_STATUS.ACTIVED));
      return {
        // history,
        current,
        viable: {trial, paid},
        authed,
      };
    });
  }

  getCurrent() {
    let { company_id } = this;
    return db.plan.company.find({
      company_id,
      status: C.PLAN_STATUS.ACTIVED
    })
    .then(planList => {
      return this._getCurrent(planList);
    });
  }

  _getCurrent(planList) {
    let len = planList.length;
    // free
    if (len == 0) {
      return {
        plan: C.TEAMPLAN.FREE,
        member_count: 0,
      };
    }
    // trial or paid
    if (len == 1) {
      return planList[0];
    }
    // trial and paid
    if (len == 2) {
      return _.find(planList, item => item.type == 'trial');
    }
  }

  getUpgradeStatus() {
    let { company_id } = this;
    return db.plan.company.findOne({
      company_id,
      type: 'paid',
      status: C.PLAN_STATUS.ACTIVED
    })
    .then(doc => {
      if (!doc) {
        return null;
      }
      let now = moment().startOf('date');
      let { plan, date_end, member_count } = doc;
      let times = moment(date_end).diff(now, 'month');
      if (times <= 0) {
        return null;
      }
      return {times, plan, member_count};
    });
  }

  createNewTrial(data) {
    let { company_id } = this;
    let { plan, user_id } = data;
    return  db.plan.company.update({
      company_id,
      status: C.PLAN_STATUS.ACTIVED,
      type: 'trial',
    }, {
      $set: {
        status: C.PLAN_STATUS.EXPIRED,
      }
    })
    .then(() => {
      return db.plan.company.insert({
        company_id,
        user_id,
        type: 'trial',
        plan,
        member_count: 0,
        status: C.PLAN_STATUS.ACTIVED,
        date_start: new Date(),
        date_end: moment().add(config.get('plan.trial_times'), 'month').toDate(),
      });
    });
  }

  updatePaidFromOrder(order) {
    let { company_id } = this;
    let { plan, order_type, times, date_create, member_count } = order;
    return this.getCurrent().then(current => {
      let {date_start, date_end, type, status} = current;
      let update = {
        status: C.PLAN_STATUS.ACTIVED,
        date_start
      };
      if (order_type == C.ORDER_TYPE.NEWLY) {
        update.date_start = new Date();
        date_end = moment(date_create).add(times, 'month').toDate();
      } else if (order_type == C.ORDER_TYPE.RENEWAL) {
        date_end = moment(date_end).add(times, 'month').toDate();
      } else if (order_type == C.ORDER_TYPE.PATCH) {
        date_end = moment(date_start).month(new Date().getMonth() + 1).toDate();
      }
      update.date_end = date_end;
      if (_.contains([C.ORDER_TYPE.NEWLY, C.ORDER_TYPE.UPGRADE, C.ORDER_TYPE.DEGRADE], order_type)) {
        update.member_count = member_count;
      }
      if (type == 'trial' && status == C.PLAN_STATUS.ACTIVED && current._id) {
        db.plan.company.update({
          _id: current._id
        }, {
          $set: {
            status: C.PLAN_STATUS.EXPIRED
          }
        });
      }
      return db.plan.company.update({
        company_id,
        type: 'paid',
        plan,
      }, {
        $set: update
      }, {
        upsert: true
      });
    });
  }

  static getSetting(type) {
    return db.plan.findOne({type});
  }

  static list() {
    return Promise.all([
      db.plan.find(),
      db.payment.product.find()
    ])
    .then(([plans, products]) => {
      plans.forEach(plan => {
        plan.products = _.filter(products, product => product.plan == plan.type);
      });
      return plans;
    });
  }

}
