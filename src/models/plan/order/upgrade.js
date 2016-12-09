import _ from 'underscore';
import Promise from 'bluebird';
import moment from 'moment';

import { ApiError } from 'lib/error';
import C from 'lib/constants';
import db from 'lib/database';
import Coupon from 'models/plan/coupon';
import Payment from 'models/plan/payment';
import Discount from 'models/plan/discount';
import Base from './base';
import PaymentDiscount from 'models/plan/payment-discount';
import ProductDiscount from 'models/plan/product-discount';
import CompanyLevel from 'models/company-level';


export default class UpgradeOrder extends Base {

  constructor(options) {
    super(options);
    let { user_id, company_id, plan } = options;
    if (!plan) {
      throw new Error('invalid plan');
    }
    this.plan = plan;
    this.order_type = C.ORDER_TYPE.UPGRADE;
  }

  isValid() {
    return Promise.all([
      this.getPlanStatus(),
      this.getLimits(),
    ])
    .then(([{current, authed}, {times}]) => {
      let error = [];
      let isValid = true;
      if (!_.contains(authed, this.plan)) {
        isValid = false;
        error.push('plan_not_authed');
      }
      if (!current || current.type == 'trial' || current.plan == C.TEAMPLAN.FREE) {
        isValid = false;
        error.push('invalid_plan_status');
      }
      if (times) {
        if (this.times < times.min || this.times > times.max) {
          isValid = false;
          error.push('invalid_times');
        }
      }
      return {isValid, error};
    });
  }

  getLimits() {
    let {plan, company_id, limits} = this;
    if (limits) {
      return Promise.resolve(limits);
    }
    return Promise.all([
      this.getTimes(),
      this.getCompanyLevelStatus(),
    ])
    .then(([times, companyLevelStatus]) => {
      let {setting, planInfo, levelInfo} = companyLevelStatus;
      this.limits = {
        member_count: {
          min: planInfo.member_count || 0,
          max: setting.max_member - setting.default_member
        },
        times: {
          min: times,
          max: times,
        }
      };
      return this.limits;
    });
  }

  getTimes() {
    let {times} = this;
    if (times) {
      return Promise.resolve(times);
    }
    return this.getPlanStatus().then(({current}) => {
      if (!current || !current.date_end) {
        return 0;
      }
      let times = moment(current.date_end).diff(moment(), 'month');
      this.times = times > 0 ? times : 0;
      return this.times;
    });
  }

}
