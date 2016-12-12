import _ from 'underscore';
import Promise from 'bluebird';
import config from 'config';

import { ApiError } from 'lib/error';
import C from 'lib/constants';
import db from 'lib/database';
import Base from './base';
import Product from '../product';

export default class NewlyOrder extends Base {

  constructor(props) {
    super(props);
    this.order_type = C.ORDER_TYPE.NEWLY;
  }

  init({plan, member_count}) {
    this.member_count = member_count || 0;
    if (!plan) {
      return Promise.reject();
    }
    this.plan = plan;
    return Product.getByPlan(plan).then(planProducts => {
      let products = [];
      planProducts.forEach(product => {
        if (product.product_no == 'P0002') {
          product.quantity = member_count || 0;
        } else if (product.product_no == 'P0001') {
          product.quantity = 1;
        }
        product.sum = product.original_price * product.quantity;
        products.push(product);
      });
      this.products = products;
    });
  }

  isValid() {
    return Promise.all([
      this.getPlanStatus(),
      this.getLimits(),
    ])
    .then(([{current, authed}, {member_count, times}]) => {
      let error = [];
      let isValid = true;
      if (!_.contains(authed, this.plan)) {
        isValid = false;
        error.push('plan_not_authed');
      }
      if (current && (current.type != 'trial') && current.plan != C.TEAMPLAN.FREE) {
        isValid = false;
        error.push('plan_using');
      }
      if (this.member_count < member_count.min || this.member_count > member_count.max) {
        isValid = false;
        error.push('invalid_member_count');
      }
      if (this.times < times.min || this.times > times.max) {
        isValid = false;
        error.push('invalid_times');
      }
      return {isValid, error};
    });
  }

  getLimits() {
    let {plan, company_id, limits} = this;
    if (limits) {
      return Promise.resolve(limits);
    }
    return this.getCompanyLevelStatus()
    .then(companyLevelStatus => {
      let {setting, planInfo, levelInfo} = companyLevelStatus;
      let minMember = levelInfo.member.count - setting.default_member;
      this.limits = {
        member_count: {
          min: minMember > 0 ? minMember : 0,
          max: setting.max_member - setting.default_member
        },
        times: {
          min: 1,
          max: config.get('plan.max_times'),
        }
      };
      return this.limits;
    });
  }

}
