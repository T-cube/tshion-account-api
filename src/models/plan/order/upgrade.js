import _ from 'underscore';
import Promise from 'bluebird';

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
    .then(([{current, authed}, {member_count}]) => {
      let error = [];
      let isValid = true;
      if (!_.contains(authed, this.plan)) {
        isValid = false;
        error.push('plan_not_authed');
      }
      if (current && (current.type != 'trial' && current.plan != C.TEAMPLAN.FREE)) {
        isValid = false;
        error.push('plan_using');
      }
      let memberNum = _.find(this.products, product => product.product_no == 'P0002');
      if (member_count) {
        let {min, max} = member_count;
        let quantity = memberNum ? memberNum.quantity : 0;
        if (min > quantity || max < quantity) {
          isValid = false;
          error.push('invalid_member_count');
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
      let minMember = levelInfo.member.count - setting.default_member;
      this.limits = {
        member_count: {
          min: minMember > 0 ? minMember : 0,
          max: setting.max_member - setting.default_member
        },
      };
      return this.limits;
    });
  }

}
