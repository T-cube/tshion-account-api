
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
    return db.plan.auth.insert(data);
  }

  getActiveAuth() {
    let { company_id } = this;
    return db.plan.auth.findOne({
      company_id,
      status: {
        $in: ['posted', 'reposted', 'accepted']
      }
    }, {
      plan: 1,
      status: 1
    });
  }

  getRejectedAuth() {
    let { company_id } = this;
    return db.plan.auth.findOne({
      company_id,
      status: 'rejected'
    }, {
      plan: 1,
      status: 1
    });
  }

  getAuthPlan() {
    let { company_id } = this;
    return db.plan.auth.findOne({
      company_id,
      status: 'accepted'
    }, {
      plan: 1,
    })
    .then(authInfo => (authInfo && authInfo.plan) || 'free');
  }

  cancel() {
    let { company_id } = this;
    return db.plan.auth.update({
      company_id,
      status: {
        $in: ['posted', 'reposted', 'accepted']
      }
    }, {
      $set: {
        status: 'cancelled'
      }
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

  revoke() {
    let { company_id } = this;
    return db.plan.auth.update({
      company_id
    }, {
      $set: {
        status: ''
      }
    });
  }

  audit() {
    let { company_id } = this;
    return db.plan.auth.update({
      company_id,
      status: '',
    }, {
      $set: {
        status: ''
      }
    })
    .then(() => this.logAuth());
  }

  logAuth(log) {
    let { company_id } = this;
    log.date_create = new Date();
    validate('log', log);
    return db.plan.auth.update({
      company_id
    }, {
      $push: {log}
    });
  }

}
