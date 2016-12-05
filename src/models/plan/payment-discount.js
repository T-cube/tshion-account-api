
import db from 'lib/database';

export default class PaymentDiscount {

  constructor() {}

  create(data) {
    return db.discount.insert(data);
  }

  delete(_id) {
    return db.discount.remove({_id});
  }

  static getDiscount(order) {
    return Promise.resolve(0);
  }

}
