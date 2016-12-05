import _ from 'underscore';

import { ApiError } from 'lib/error';
import db from 'lib/database';
import { validate } from './schema';

export default class Auth {

  constructor(company_id, user_id) {
    this.company_id = company_id;
    this.user_id = user_id;
  }

  create(data) {
    let { company_id, user_id } = this;
    data.company_id = company_id;
    data.user_id = user_id;
    data.date_apply = new Date();
    data.status = 'posted';
    return this.getActiveAuth()
    .then(doc => {
      return doc || db.plan.auth.insert(data);
    });
  }

  update(data) {
    let { company_id, user_id } = this;
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

  getActiveAuth() {
    let { company_id } = this;
    return db.plan.auth.findOne({
      company_id,
      status: {
        $nin: ['expired', 'canceled']
      }
    }, {
      plan: 1,
      status: 1
    });
  }

  getRejectedAuth() {
    let { company_id } = this;
    return Promise.all([
      db.plan.auth.count({
        company_id,
        status: 'accepted'
      }),
      db.plan.auth.findOne({
        company_id,
        status: 'rejected'
      }, {
        plan: 1,
        status: 1
      })
    ])
    .then(doc => !doc[0] && doc[1]);
  }

  getAuthPlan() {
    let { company_id } = this;
    return db.plan.auth.find({
      company_id,
      status: 'accepted'
    });
  }

  getPlanOfStatus(status, fields) {
    if (!_.isString(status)) {
      status = [status];
    } else if (!_.isArray[status])  {
      return Promise.resolve([]);
    }
    let { company_id } = this;
    return db.plan.auth.findOne({
      company_id,
      status: {
        $in: status
      }
    }, fields || {});
  }

  updateStatus(status) {
    let { company_id, user_id } = this;
    return db.plan.auth.update({
      company_id,
      status: {
        $in: ['posted', 'reposted']
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

  list(options) {
    let { company_id } = this;
    let { page, pagesize } = options;
    let criteria = company_id ? {company_id} : {};
    return db.plan.auth.find(criteria).limit(pagesize).skip(pagesize * (page - 1));
  }

  static audit(options) {
    let { status, comment, user_id, company_id } = options;
    let log = {
      status,
      comment,
      user_id,
      date_create: new Date(),
    };
    return db.plan.auth.update({
      company_id,
      status: {
        $in: ['posted', 'reposted']
      },
    }, {
      $set: {status}
    })
    .then(() => Auth.logAuth(log));
  }

  static logAuth(log) {
    let { company_id } = this;
    log.date_create = new Date();
    // validate('log', log);
    return db.plan.auth.update({
      company_id
    }, {
      $push: {log}
    });
  }

}
