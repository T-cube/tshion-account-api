import _ from 'underscore';
import Promise from 'bluebird';
import config from 'config';
import moment from 'moment';

import { ApiError } from 'lib/error';
import C from 'lib/constants';
import db from 'lib/database';
import Base from './base';
import PlanProduct from '../plan-product';

export default class RenewalOrder extends Base {

  constructor(props) {
    super(props);
    this.order_type = C.ORDER_TYPE.RENEWAL;
  }

  init({coupon, times}) {
    if (coupon) {
      this.withCoupon(coupon);
    }
    let {current} = this.getPlanStatus();
    let {plan, member_count} = current;
    this.plan = plan;
    this.times = times;
    this.member_count = member_count;
    return PlanProduct.init({plan, member_count, times})
    .then(planProduct => {
      this.products = planProduct.getProducts();
    });
  }

  isValid() {
    let {current} = this.getPlanStatus();
    let {times} = this.getLimits();
    let error = [];
    let isValid = true;
    if (!current || current.type == 'trial' || current.plan == C.TEAMPLAN.FREE) {
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
    return Promise.resolve({isValid, error});
  }

  getLimits() {
    let {current} = this.getPlanStatus();
    if (!current || !current.date_end) {
      return {};
    }
    let max;
    if (current.date_end < new Date()) {
      max = config.get('plan.max_times');
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
  }

}
