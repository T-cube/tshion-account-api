

import C from 'lib/constants';

import Order from './order';


export default class RechargeOrder extends Order {

  constructor(props) {
    super(props);
    this.order_type = C.PAYMENT.ORDER.TYPE.RECHARGE;
  }

  create() {

  }

  prepare() {

  }

  getDiscount() {
    
  }

}
