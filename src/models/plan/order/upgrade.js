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

  constructor(props) {
    super(props);
    this.times = undefined;
    this.order_type = C.ORDER_TYPE.UPGRADE;
  }

  init() {
    return Promise.all([
      super.init(),
      this.getTimes(),
    ]);
  }

  isValid() {
    return Promise.all([
      this.getPlanStatus(),
      this.getLimits(),
      this.getTimes(),
    ])
    .then(([{current, authed}, {member_count}, times]) => {
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
      if (this.member_count < member_count.min || this.member_count > member_count.max) {
        isValid = false;
        error.push('invalid_member_count');
      }
      if (this.plan == current.plan && this.member_count == member_count.min) {
        isValid = false;
        error.push('eq_current_status');
      }
      if (times <= 0) {
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
      this.limits = {
        member_count: {
          min: planInfo.member_count || 0,
          max: setting.max_member - setting.default_member
        }
      };
      return this.limits;
    });
  }

  getTimes() {
    return this.getPlanStatus().then(({current}) => {
      let times;
      if (!current || current.type == 'trial' || !current.date_end) {
        times = 0;
      } else {
        times = moment(current.date_end).diff(moment(), 'month');
      }
      this.times = times > 0 ? (Math.round(times * 100) / 100) : times;
      return this.times;
    });
  }

}
