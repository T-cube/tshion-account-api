import _ from 'underscore';
import Promise from 'bluebird';
import moment from 'moment';

import { ApiError } from 'lib/error';
import C from 'lib/constants';
import db from 'lib/database';
import Base from './base';


export default class PatchOrder extends Base {

  constructor(props) {
    super(props);
    this.order_type = C.ORDER_TYPE.PATCH;
    this.times = undefined;
  }

  init({coupon}) {
    if (coupon) {
      this.withCoupon(coupon);
    }
    let {current} = this.getPlanStatus();
    let times = this.getTimes();
    let {plan, member_count} = current;
    this.plan = plan;
    this.member_count = member_count;
    return this.getProducts(plan)
    .then(planProducts => {
      let products = [];
      this.times = times;
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
  }

  isValid() {
    let {current} = this.getPlanStatus();
    let times = this.getTimes();
    let error = [];
    let isValid = true;
    if (!current || current.type == 'trial' || current.plan == C.TEAMPLAN.FREE || times <= 0) {
      isValid = false;
      error.push('invalid_plan_status');
    }
    return Promise.resolve({isValid, error});
  }

  getTimes() {
    if (this.times !== undefined) {
      return this.times;
    }
    let {current} = this.getPlanStatus();
    let times;
    if (!current || current.type == 'trial' || !current.date_end) {
      times = 0;
    } else {
      times = moment().diff(current.date_end, 'month', true);
    }
    return times > 0 ? (Math.round(times % 1 * 100) / 100) : 0;
  }

}
