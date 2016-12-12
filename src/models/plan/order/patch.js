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


export default class PatchOrder extends Base {

  constructor(props) {
    super(props);
    this.order_type = C.ORDER_TYPE.DEGRADE;
    this.times = undefined;
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
      this.getTimes(),
    ])
    .then(([{current}, times]) => {
      let error = [];
      let isValid = true;
      if (!current || current.type == 'trial' || current.plan == C.TEAMPLAN.FREE) {
        isValid = false;
        error.push('invalid_plan_status');
      }
      if (times <= 0) {
        isValid = false;
        error.push('invalid_times');
      }
      return {isValid, error};
    });
  }

  getLimits() {}

  getTimes() {
    return this.getPlanStatus().then(({current}) => {
      let times;
      if (!current || current.type == 'trial' || !current.date_end) {
        times = 0;
      } else {
        times = moment().diff(current.date_end, 'month', true);
      }
      this.times = times > 0 ? (Math.round(times % 1 * 100) / 100) : 0;
      return this.times;
    });
  }

}
