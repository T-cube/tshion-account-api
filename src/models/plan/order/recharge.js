import _ from 'underscore';
import Promise from 'bluebird';
import config from 'config';

import { ApiError } from 'lib/error';
import C from 'lib/constants';
import db from 'lib/database';
import Base from './base';

export default class RechargeOrder extends Base {

  constructor(props) {
    super(props);
    this.order_type = C.ORDER_TYPE.RECHARGE;
  }

  init() {

  }

  isValid() {

  }

  getLimits() {

  }

}
