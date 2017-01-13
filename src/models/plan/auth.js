import Promise from 'bluebird';
import { ObjectId } from 'mongodb';

import C from 'lib/constants';
import { ApiError } from 'lib/error';
import db from 'lib/database';

export default class Auth {

  constructor(company_id) {
    this.company_id = company_id;
  }

  create(plan, data) {
    let { company_id } = this;
    data.date_create = new Date();
    data._id = ObjectId();
    data.status = C.AUTH_STATUS.POSTED;
    return this.ensureCanPostAuth(plan)
    .then(() => this.getAuthStatus())
    .then(({pending}) => {
      return Promise.all([
        db.plan.auth.insert({
          company_id,
          plan,
          status: C.AUTH_STATUS.POSTED,
          data: [data],
          date_apply: new Date(),
        }),
        pending && db.plan.auth.update({
          _id: pending._id
        }, {
          $set: {status: C.AUTH_STATUS.EXPIRED}
        })
      ])
      .then(doc => doc[0]);
    });
  }

  update(data) {
    let { company_id } = this;
    data.date_create = new Date();
    data._id = ObjectId();
    data.status = C.AUTH_STATUS.REPOSTED;
    return db.plan.auth.update({
      company_id,
      status: C.AUTH_STATUS.REJECTED
    }, {
      $set: {status: C.AUTH_STATUS.REPOSTED},
      $push: {data}
    });
  }

  getAuthStatus() {
    let { auth_status } = this;
    if (auth_status) {
      return Promise.resolve(auth_status);
    }
    return Promise.all([
      this.getCertified(),
      this.getPendingAuth(),
    ])
    .then(([certified, pending]) => {
      if (certified && (certified.plan == C.TEAMPLAN.ENT || (pending && certified.date > pending.date_apply))) {
        pending = null;
      }
      this.auth_status = {certified: certified && certified.plan, pending};
      return this.auth_status;
    });
  }

  getAuthStatusDetail() {
    let { company_id } = this;
    return this.getAuthStatus().then(doc => {
      if (!doc.certified) {
        return doc;
      }
      return db.plan.auth.findOne({
        company_id,
        plan: doc.certified,
        status: C.AUTH_STATUS.ACCEPTED
      }, {
        data: 0,
        log: 0
      })
      .then(certified => {
        doc.certified = certified;
        return doc;
      });
    });
  }

  ensureCanPostAuth(plan) {
    return this.getAuthStatus()
    .then(({certified, pending}) => {
      if ((certified == plan)
        || (pending && pending.status != C.AUTH_STATUS.REJECTED)) {
        throw new ApiError(400, 'auth_exists');
      }
      if (certified == C.TEAMPLAN.ENT) {
        throw new ApiError(400, 'ent_certified');
      }
    });
  }

  ensureCanUpdateAuth(plan) {
    return this.getAuthStatus()
    .then(({pending}) => {
      if (!pending || pending.status != C.AUTH_STATUS.REJECTED || plan != pending.plan) {
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
          status: C.AUTH_STATUS.CANCELLED
        }
      });
    });
  }

  getCertified() {
    let { company_id } = this;
    return db.plan.company.findOne({
      _id: company_id,
    }, {
      certified: 1
    })
    .then(doc => {
      return doc && doc.certified;
    });
  }

  getPendingAuth() {
    let { company_id } =this;
    return db.plan.auth.find({
      company_id,
      status: {
        $in: [
          C.AUTH_STATUS.POSTED,
          C.AUTH_STATUS.REPOSTED,
          C.AUTH_STATUS.REJECTED,
        ]
      }
    }, {
      data: 0,
      log: 0
    })
    .sort({date_apply: -1})
    .limit(1)
    .then(doc => doc[0]);
  }

}
