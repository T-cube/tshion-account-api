
import db from 'lib/database';

export default class ChargeDiscount {

  constructor() {}

  create(data) {
    return db.charge.discount.insert(data);
  }

  delete(_id) {
    return db.charge.discount.remove({_id});
  }

  getAvaliable() {
    
  }

}
