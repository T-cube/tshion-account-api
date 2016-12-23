import _ from 'underscore';
import Promise from 'bluebird';
import moment from 'moment';

import { ApiError } from 'lib/error';
import C from 'lib/constants';
import db from 'lib/database';
import Base from './base';
import Coupon from 'models/plan/coupon';
import Payment from 'models/plan/payment';
import Discount from 'models/plan/discount';
import CompanyLevel from 'models/company-level';


export default class DegradeOrder extends Base {

  constructor(props) {
    super(props);
    this.times = undefined;
    this.order_type = C.ORDER_TYPE.DEGRADE;
  }

  init({member_count, plan}) {
    this.plan = plan;
    this.member_count = plan == C.TEAMPLAN.FREE ? 0 : member_count;
    return this.getPlanStatus().then(({current}) => {
      this.original_plan = current.plan;
    });
  }

  isValid() {
    return Promise.all([
      this.getPlanStatus(),
      this.getLimits(),
      this.getTimes(),
    ])
    .then(([{current, viable}, {member_count}, times]) => {
      let error = [];
      let isValid = true;
      if (!current || current.type == 'trial' || current.plan == C.TEAMPLAN.FREE || times <= 0) {
        isValid = false;
        error.push('invalid_plan_status');
      }
      if (this.member_count < member_count.min || this.member_count > member_count.max) {
        isValid = false;
        error.push('invalid_member_count');
      }
      if (this.plan != C.TEAMPLAN.FREE) {
        if (!_.contains(viable.paid, this.plan)) {
          isValid = false;
          error.push('plan_not_authed');
        }
        if (this.plan == current.plan && this.member_count == member_count.max) {
          isValid = false;
          error.push('eq_current_status');
        }
        if (this.member_count != current.member_count && this.plan != current.plan) {
          isValid = false;
          error.push('cannot_update_multi');
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
    return this.getCompanyLevelStatus()
    .then(companyLevelStatus => {
      let {setting, planInfo, levelInfo} = companyLevelStatus;
      if (this.plan == C.TEAMPLAN.FREE) {
        this.limits = {
          member_count: {
            min: 1,
            max: setting.default_member,
          }
        };
      } else {
        let minMember = levelInfo.member.count - setting.default_member;
        this.limits = {
          member_count: {
            min: minMember > 0 ? minMember : 0,
            max: planInfo.member_count || 0,
          }
        };
      }
      return this.limits;
    });
  }

  getTimes() {
    return this.getPlanStatus().then(({current}) => {
      let times;
      if (!current || current.type == 'trial' || !current.date_end) {
        times = 0;
      } else {
        times = moment(current.date_end).diff(moment(), 'month', true);
      }
      this.times = times > 0 ? (Math.round(times * 100) / 100) : times;
      return this.times;
    });
  }

}
