
import db from 'lib/database';

export default class PaymentDiscount {

  constructor() {}

  static getDiscount(order) {
    return Promise.resolve(0);
  }

}
