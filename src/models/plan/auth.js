import _ from 'underscore';
import Promise from 'bluebird';

import C from 'lib/constants';
import { ApiError } from 'lib/error';
import db from 'lib/database';

export default class Auth {

  constructor(company_id) {
    this.company_id = company_id;
  }

  create(data) {
    let { company_id } = this;
    let { plan } = data;
    data.company_id = company_id;
    data.date_apply = new Date();
    data.status = 'posted';
    return this.checkCreate(plan).then(() => {
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

  getAuthStatus() {
    let { company_id } = this;
    let plansPaid = _.values(C.TEAMPLAN_PAID);
    return Promise.map(plansPaid, plan => {
      return db.plan.auth.find({company_id, plan}, {info: 0, log: 0})
      .sort({date_apply: -1})
      .limit(1)
      .then(doc => doc[0]);
    })
    .then(list => {
      list = _.filter(list);
      let authed = _.find(list, item => item.status == C.AUTH_STATUS.ACCEPTED);
      let pending =  _.find(list, item => _.contains(
        [
          C.AUTH_STATUS.POSTED,
          C.AUTH_STATUS.REPOSTED,
          C.AUTH_STATUS.REJECTED,
        ],
        item.status
      ));
      if (authed && (authed.plan == C.TEAMPLAN.ENT || (pending && authed.date_apply > pending.date_apply))) {
        pending = null;
      }
      return {authed, pending};
    });
  }

  checkCreate(plan) {
    return this.getAuthStatus()
    .then(({authed, pending}) => {
      if ((authed && authed.plan == plan)
        || (pending && pending.status != C.AUTH_STATUS.REJECTED)) {
        throw new ApiError(400, 'auth_exists');
      }
      if (authed && authed.plan == C.TEAMPLAN.ENT) {
        throw new ApiError(400, 'ent_authed');
      }
    });
  }

  checkUpdate(plan) {
    return this.getAuthStatus()
    .then(({pending}) => {
      if (!pending || pending.status != 'rejected' || plan != pending.plan) {
        throw new ApiError(400, 'auth_cannot_update');
      }
    });
  }

  cancel(plan) {
    return this.getAuthStatus()
    .then(({pending}) => {
      if (!pending || pending == C.AUTH_STATUS.ACCEPTED || plan != pending.plan) {
        throw new ApiError(400, 'auth_cannot_cancel');
      }
      return db.plan.auth.update({
        _id: pending._id
      }, {
        $set: {
          status: C.PLAN_STATUS.CANCELED
        }
      });
    });
  }

  getAuthedPlan() {
    let { company_id } = this;
    return db.plan.auth.findOne({
      company_id,
      status: 'accepted'
    }, {
      plan: 1
    })
    .then(doc => doc && doc.plan);
  }

  list(options) {
    let { page, pagesize } = options;
    let { company_id } = this;
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
