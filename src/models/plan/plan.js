import _ from 'underscore';
import Promise from 'bluebird';
import moment from 'moment';

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
      let trial = C.PLAN.TEAMPLAN_PAID.filter(item => -1 == history.map(h => h.plan).indexOf(item));
      let current = this._getCurrent(history.filter(item => item.status == C.PLAN.PLAN_STATUS.ACTIVED));
      let paid = C.PLAN.TEAMPLAN_PAID;
      return {
        history,
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
      status: C.PLAN.PLAN_STATUS.ACTIVED
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
        plan: C.PLAN.TEAMPLAN.FREE,
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
      status: C.PLAN.PLAN_STATUS.ACTIVED
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
    return Plan.getDefaultMemberCount(plan)
    .then(member_count => {
      return db.plan.company.insert({
        company_id,
        user_id,
        type: 'trial',
        plan,
        member_count,
        status: C.PLAN.PLAN_STATUS.ACTIVED,
        date_start: new Date(),
        date_end: moment().add(30, 'day').toDate(),
      });
    });
  }

  updatePaid(data) {
    data.type = 'paid';
    let { company_id } = this;
    return db.plan.company.update({
      company_id,
    }, {
      $set: data
    }, {
      upsert: true
    });
  }

  static getSetting(plan) {
    // return db.plan.findOne({plan}); // TODO
    return Plan.list().then(doc => {
      return _.find(doc, item => item.type == plan);
    });
  }

  static getDefaultMemberCount(plan) {
    return Promise.resolve(10);
  }

  static list() {
    return db.product.find({
      product_no: {
        $in: ['P0001', 'P0002']
      }
    })
    .then(products => {
      return [
        {
          name: '免费版',
          type: 'free',
          description: '免费团队，可使用T立方的基本功能',
          store: 1000000000,
          inc_member_store: 10,
          max_file_size: 100000,
          max_member: 10,
          products: _.filter(products, product => product.plan == 'free'),
        },
        {
          name: '专业版',
          type: 'pro',
          description: '',
          store: 10000000000,
          inc_member_store: 10,
          max_file_size: 100000,
          max_member: 50,
          products: _.filter(products, product => product.plan == 'pro'),
          ext_info: '专业版',
        },
        {
          name: '企业版',
          type: 'ent',
          description: '',
          store: 10000000000,
          inc_member_store: 10,
          max_file_size: 100000,
          max_member: 100,
          products: _.filter(products, product => product.plan == 'ent'),
          ext_info: '企业版',
        },
      ];
    });
  }

}
