import _ from 'underscore';
import Promise from 'bluebird';

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
    return db.plan.company.findOne({
      company_id,
      status: 'actived'
    });
  }

  createNewTrial(data) {
    let { company_id } = this;
    data.type = 'trial';
    return this.ensureTrialNotExists(company_id)
    .then(() => {
      return db.plan.company.insert(data);
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

  createNewPaid(data, period) {
    data.type = 'paid';
    return db.plan.company.insert(data);
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

  expireCurrent() {
    let { company_id } = this;
    return db.plan.company.update({
      company_id,
      status: 'actived'
    }, {
      $set: {
        status: 'expired'
      }
    });
  }

  getProducts() {
    let { company_id } = this;
    let auth = new Auth(company_id);
    return auth.getAuthPlan().then(plan => {
      console.log('plan', plan);
      if (!plan) {
        return null;
      }
      return Product.getByPlan(plan);
    });
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
          max_member: 10,
          products: _.find(products, product => product.plan == 'free'),
        },
        {
          name: '专业版',
          type: 'pro',
          description: '',
          store: 10000000000,
          max_member: 50,
          products: _.find(products, product => product.plan == 'pro'),
          ext_info: '专业版',
        },
        {
          name: '企业版',
          type: 'ent',
          description: '',
          store: 10000000000,
          max_member: 100,
          products: _.find(products, product => product.plan == 'ent'),
          ext_info: '企业版',
        },
      ];
    });
  }

}
