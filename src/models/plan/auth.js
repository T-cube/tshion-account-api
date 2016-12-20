import _ from 'underscore';
import Promise from 'bluebird';

import C from 'lib/constants';
import { ApiError } from 'lib/error';
import db from 'lib/database';

export default class Auth {

  constructor(company_id, user_id) {
    this.company_id = company_id;
    this.user_id = user_id;
  }

  create(plan, info) {
    let data = {info, plan};
    let { company_id, user_id } = this;
    data.company_id = company_id;
    data.user_id = user_id;
    data.date_apply = new Date();
    data.status = 'posted';
    return Auth.getAuthStatus(company_id, plan)
    .then(doc => {
      if (doc[plan] && !_.contains(['expired', 'cancelled'], doc[plan].status)) {
        throw new Error('auth_exists');
      }
      return db.plan.auth.insert(data);
    });
  }

  update(info) {
    let { company_id, user_id } = this;
    let data = {info};
    data.company_id = company_id;
    data.user_id = user_id;
    data.date_apply = new Date();
    data.status = 'reposted';
    return db.plan.auth.update({
      company_id,
      status: 'rejected'
    }, {
      $set: data
    });
  }

  static getAuthStatus(company_id, plan) {
    if (plan) {
      return db.plan.auth.find({company_id, plan}, {info: 0, log: 0})
      .sort({date_apply: -1})
      .limit(1)
      .then(doc => ({
        [plan]: doc[0]
      }));
    } else {
      let plansPaid = _.values(C.TEAMPLAN_PAID);
      return Promise.map(plansPaid, plan => {
        return db.plan.auth.find({company_id, plan}, {info: 0, log: 0})
        .sort({date_apply: -1})
        .limit(1)
        .then(doc => doc[0]);
      })
      .then(list => _.object(plansPaid, list));
    }
  }

  isPlanAuthed(plan) {
    let { company_id } = this;
    return db.plan.auth.count({
      company_id,
      plan,
      status: 'accepted'
    })
    .then(count => !!count);
  }

  static updateStatus(authId, status) {
    return db.plan.auth.update({
      _id: authId,
      status: {
        $nin: ['accepted']
      }
    }, {
      $set: {status}
    });
  }

  get() {
    let { company_id } = this;
    return db.plan.auth.findOne({
      company_id
    });
  }

  getAuthedPlan() {
    let { company_id } = this;
    return db.plan.auth.find({
      company_id,
      status: 'accepted'
    }, {
      plan: 1
    })
    .then(doc => doc.map(i => i.plan));
  }

  static list(company_id, options) {
    let { page, pagesize } = options;
    let criteria = company_id ? {company_id} : {};
    return Promise.all([
      db.plan.auth.count(criteria),
      db.plan.auth.find(criteria).limit(pagesize).skip(pagesize * (page - 1)),
    ])
    .then(([totalRows, list]) => ({
      page,
      pagesize,
      totalRows,
      list,
    }));
  }

}
