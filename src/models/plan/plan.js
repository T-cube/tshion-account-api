
import { ApiError } from 'lib/error';
import C from 'lib/constants';
import db from 'lib/database';
import Auth from './auth';
import Product from './product';

export default class Plan {

  constructor(company_id) {
    this.company_id = company_id;
  }

  getCurrent() {
    let { company_id } = this;
    return db.company.plan.findOne({
      company_id,
      status: 'actived'
    });
  }

  createTrial(data) {
    let { company_id } = this;
    data.type = 'trial';
    return this.ensureTrialNotExists(company_id)
    .then(() => {
      return db.company.plan.insert(data);
    });
    // {
    //   company_id: ObjectId,             // 团队
    //   user_id: ObjectId,                // 申请用户
    //   plan: TeamPlan,                   // 升级方案
    //   status: PlanStatus                // 状态
    //   date_start: Date,                 // 申请日期
    //   date_end: Date,
    // }
  }

  createPaid(data, period) {
    data.type = 'paid';
    return db.company.plan.insert(data);
  }

  ensureTrialNotExists() {
    let { company_id } = this;
    return db.plan.trial.count({company_id})
    .then(count => {
      if (count > 0) {
        throw new ApiError('400', 'plan_trial_exists');
      }
    });
  }

  expire() {
    let { company_id } = this;
    
  }

  getProduct() {
    let { company_id } = this;
    let auth = new Auth(company_id);
    return auth.getAuthPlan().then(plan => {
      if (!plan) {
        return null;
      }
      return Product.getByPlan(plan);
    });
  }

}
