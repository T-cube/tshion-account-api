import _ from 'underscore';
import Promise from 'bluebird';
import config from 'config';
import moment from 'moment';

import { ApiError } from 'lib/error';
import C from 'lib/constants';
import db from 'lib/database';
import Product from '../product';
import Base from './base';


export default class RenewalOrder extends Base {

  constructor(props) {
    super(props);
    this.order_type = C.ORDER_TYPE.RENEWAL;
  }

  init({coupon, times}) {
    if (coupon) {
      this.withCoupon(coupon);
    }
    if (times) {
      this.setTimes(times);
    }
    return this.getPlanStatus().then(({current}) => {
      let {plan, member_count} = current;
      this.plan = plan;
      this.member_count = member_count;
      return Product.getByPlan(plan)
      .then(planProducts => {
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
    });
  }

  isValid() {
    return Promise.all([
      this.getPlanStatus(),
      this.getLimits(),
    ])
    .then(([{current}, {times}]) => {
      let error = [];
      let isValid = true;
      if (!current || current.type == 'trial' || current.plan == C.TEAMPLAN.FREE || current.date_end < new Date()) {
        isValid = false;
        error.push('invalid_plan_status');
      } else {
        if (times.max < 1) {
          isValid = false;
          error.push('over_period');
        } else {
          if (this.times < times.min || this.times > times.max) {
            isValid = false;
            error.push('invalid_times');
          }
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
    return this.getPlanStatus().then(({current}) => {
      if (!current || !current.date_end) {
        return {};
      }
      let max;
      if (current.date_end < new Date()) {
        max = 0;
      } else {
        max = moment().add(config.get('plan.max_times'), 'month').diff(current.date_end, 'month');
        max = Math.floor(max);
      }
      this.limits = {
        times: {
          min: 1,
          max,
        }
      };
      return this.limits;
    });
  }

}
