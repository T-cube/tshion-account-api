
import db from 'lib/database';

export default class Coupon {

  constructor() {}

  create(data) {
    return db.coupon.insert(data);
  }

  delete(_id) {
    return db.coupon.remove({_id});
  }

}
