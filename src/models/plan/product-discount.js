
import db from 'lib/database';

export default class ProductDiscount {

  constructor() {}

  create(data) {
    return db.discount.insert(data);
  }

  delete(_id) {
    return db.discount.remove({_id});
  }

}
