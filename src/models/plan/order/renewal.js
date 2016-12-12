import _ from 'underscore';
import Promise from 'bluebird';
import config from 'config';
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


export default class RenewalOrder extends Base {

  constructor(props) {
    super(props);
    this.order_type = C.ORDER_TYPE.RENEWAL;
  }

  isValid() {
    return Promise.all([
      this.getPlanStatus(),
      this.getLimits(),
    ])
    .then(([{current}, {times}]) => {
      let error = [];
      let isValid = true;
      if (!current || current.type == 'trial' || current.plan == C.TEAMPLAN.FREE) {
        isValid = false;
        error.push('invalid_plan_status');
      }
      if (times.max < 1) {
        isValid = false;
        error.push('over_period');
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
    return this.getPlanStatus().then(({current}) => {
      if (!current || !current.date_end) {
        return {};
      }
      let max = moment().add(config.get('plan.max_times'), 'month').diff(current.date_end, 'month');
      max = Math.floor(max);
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
