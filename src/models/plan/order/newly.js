import _ from 'underscore';
import Promise from 'bluebird';
import config from 'config';

import { ApiError } from 'lib/error';
import C from 'lib/constants';
import db from 'lib/database';
import Base from './base';
import PlanProduct from '../plan-product';

export default class NewlyOrder extends Base {

  constructor(props) {
    super(props);
    this.order_type = C.ORDER_TYPE.NEWLY;
  }

  init({plan, member_count, coupon, times}) {
    if (!plan) {
      return Promise.reject();
    }
    if (coupon) {
      this.withCoupon(coupon);
    }
    member_count = member_count || 0;
    this.plan = plan;
    this.member_count = member_count;
    this.times = times;
    return PlanProduct.init({plan, times, member_count})
    .then(planProduct => {
      this.products = planProduct.getProducts();
    });
  }

  isValid() {
    let {current, viable} = this.getPlanStatus();
    return this.getLimits()
    .then(({member_count, times}) => {
      let error = [];
      let isValid = true;
      if (!_.contains(viable.paid, this.plan)) {
        isValid = false;
        error.push('plan_not_certified');
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
    return db.plan.findOne({type: plan})
    .then(setting => {
      this.limits = {
        member_count: {
          min: 0,
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
