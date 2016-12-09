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


export default class NewOrder extends Base {

  constructor(options) {
    super(options);
    let { user_id, company_id, plan } = options;
    if (!plan) {
      throw new Error('invalid plan');
    }
    this.plan = plan;
    this.order_type = C.PAYMENT.ORDER.TYPE.NEW;
  }

  isValid() {
    return this.getLimits().then(({member_count}) => {
      let memberNum = _.find(this.products, product => product.product_no == 'P0002');
      let isValid = !member_count || (memberNum && memberNum.quantity >= member_count);
      let error;
      if (!isValid) {
        error = 'invalid_member_count';
      }
      return {isValid, error};
    });
  }

  getLimits() {
    let {plan, company_id, limits} = this;
    if (limits) {
      return Promise.resolve(limits);
    }
    return new CompanyLevel(company_id).getStatus()
    .then(status => {
      let {setting, planInfo, levelInfo} = status;
      let minMember = levelInfo.member.count - setting.default_member;
      this.limits = {
        member_count: {
          min: minMember > 0 ? minMember : 0,
          max: setting.max_member - setting.default_member
        }
      };
      return this.limits;
    });
  }

}
