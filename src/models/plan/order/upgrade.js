import _ from 'underscore';
import Promise from 'bluebird';
import moment from 'moment';

import { ApiError } from 'lib/error';
import C from 'lib/constants';
import db from 'lib/database';
import Base from './base';


export default class UpgradeOrder extends Base {

  constructor(props) {
    super(props);
    this.times = undefined;
    this.order_type = C.ORDER_TYPE.UPGRADE;
  }

  init({member_count, plan, coupon}) {
    if (coupon) {
      this.withCoupon(coupon);
    }
    this.plan = plan;
    this.member_count = member_count;
    let {current} = this.getPlanStatus();
    this.original_plan = current.plan;
    let fetchNewPlanProducts = this.getProducts(plan);
    let fetchOriPlanProducts = current.plan == plan || this.getProducts(current.plan);
    let times = this.getTimes();
    return new Promise.all([
      fetchNewPlanProducts,
      fetchOriPlanProducts,
    ])
    .then(([planProducts, oriProducts]) => {
      let products = [];
      this.times = times;
      if (member_count > current.member_count) {
        let incMember = _.find(planProducts, product => product.product_no == 'P0002');
        if (incMember) {
          products.push(_.extend(incMember, {quantity: member_count - current.member_count}));
        }
      }
      if (plan != current.plan) {
        let incPlan = _.find(planProducts, product => product.product_no == 'P0001');
        let oriIncPlan = _.find(oriProducts, product => product.product_no == 'P0001');
        if (incPlan && oriIncPlan) {
          products.push(_.extend({}, incPlan, {
            original_price: incPlan.original_price - oriIncPlan.original_price,
            quantity: 1,
          }));
        }
        if (current.member_count) {
          let incMember = _.find(planProducts, product => product.product_no == 'P0002');
          let oriIncMember = _.find(oriProducts, product => product.product_no == 'P0002');
          if (incMember && oriIncMember) {
            products.push(_.extend({}, incMember, {
              original_price: incMember.original_price - oriIncMember.original_price,
              quantity: current.member_count,
            }));
          }
        }
      }
      this.products = products;
    });
  }

  isValid() {
    let times = this.getTimes();
    let {current, viable} = this.getPlanStatus();
    return this.getLimits()
    .then(({member_count}) => {
      let error = [];
      let isValid = true;
      if (!_.contains(viable.paid, this.plan)) {
        isValid = false;
        error.push('plan_not_certified');
      }
      if (!current || current.type == 'trial' || current.plan == C.TEAMPLAN.FREE || times <= 0) {
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
      if (this.member_count != current.member_count && this.plan != current.plan) {
        isValid = false;
        error.push('cannot_update_multi');
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
    let {current} = this.getPlanStatus();
    let times;
    if (!current || current.type == 'trial' || !current.date_end) {
      times = 0;
    } else {
      times = moment(current.date_end).diff(moment(), 'month', true);
    }
    return times > 0 ? (Math.round(times * 100) / 100) : times;
  }

}
