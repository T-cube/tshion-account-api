import _ from 'underscore';
import Promise from 'bluebird';

import C from 'lib/constants';
import db from 'lib/database';
import Order from './order';
import Plan from './plan';
import ProductDiscount from './product-discount';
import CompanyLevel from 'models/company-level';

const UPGRADE_TYPE = {
  INCR_MEMBER: 'INCR_MEMBER',
  INCR_TIMES: 'INCR_TIMES',
  INCR_TIMES_AND_MEMBER: 'INCR_TIMES_AND_MEMBER',
  CHANGE_PLAN: 'CHANGE_PLAN',
};

export default class UpgradeOrder extends Order {

  constructor(options) {
    super(options);
    this.order_type = C.PAYMENT.ORDER.TYPE.UPGRADE;
    let {company_id} = options;
    this.companyLevel = new CompanyLevel(company_id);
  }

  getUpgradeType() {
    return this.companyLevel.getStatus().then(status => {
      let {planInfo} = status;
      if (this.plan == planInfo.plan) {
        if (!this.times && this.products.length) {
          return UPGRADE_TYPE.INCR_MEMBER;
        }
        if (this.times && !this.products.length) {
          return UPGRADE_TYPE.INCR_TIMES;
        }
        return UPGRADE_TYPE.INCR_TIMES_AND_MEMBER;
      }
      return UPGRADE_TYPE.CHANGE_PLAN;
    });
  }

  getUpgradeTimes() {
    return; // TODO return a promise
  }

  prepare() {
    let { products } = this;
    return this.isValid().then(({error, isValid}) => {
      if (!isValid) {
        return {
          isValid,
          error,
          limits: this.limits,
        };
      }
      this.paid_sum = this.original_sum = ProductDiscount.getOriginalFeeOfProducts(products);
      return this.getDiscount().then(() => ({
        isValid,
        limits: this.limits,
        order: {
          user_id: this.user_id,
          company_id: this.company_id,
          plan: this.plan,
          order_type: this.order_type,
          products: this.products,
          times: this.times,
          original_sum: this.original_sum,
          paid_sum: Math.round(this.paid_sum),
          coupon: this.coupon,
          discount: this.discount,
          status: this.status,
          date_create: this.date_create,
          date_update: this.date_update,
        },
      }));
    });
  }

  isValid() {}

  getLimits() {
    let {plan, company_id, limits} = this;
    if (limits) {
      return Promise.resolve(limits);
    }
    return this.companyLevel.getStatus()
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
