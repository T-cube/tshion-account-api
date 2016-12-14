import _ from 'underscore';

import db from 'lib/database';

export default class ProductDiscount {

  constructor() {}

  create(data) {
    return db.payment.discount.insert(data);
  }

  delete(_id) {
    return db.payment.discount.remove({_id});
  }

  static getOriginalFeeOfProducts(products) {
    return _.reduce(products.map(product => product.quantity * product.original_price), (memo, num) => memo + num, 0);
  }


}
