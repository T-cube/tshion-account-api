
import db from 'lib/database';
import { validate } from './schema';

export default class Auth {

  constructor(company_id) {
    this.company_id = company_id;
  }

  create(data) {
    validate('auth', data);
    return db.plan.auth.insert(data);
  }

  getPlan() {
    let { company_id } = this;
    return db.plan.auth.findOne({
      company_id,
      status: 'actived'
    }, {
      plan: 1,
    })
    .then(authInfo => authInfo && authInfo.plan);
  }

  expireA() {
    let { company_id } = this;
    return db.plan.auth.update({
      company_id,
      status: 'actived'
    }, {
      $set: {
        status: 'expired'
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
