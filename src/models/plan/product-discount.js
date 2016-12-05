import _ from 'underscore';

import db from 'lib/database';

export default class ProductDiscount {

  constructor() {}

  create(data) {
    return db.product.discount.insert(data);
  }

  delete(_id) {
    return db.product.discount.remove({_id});
  }

  static getOriginalFeeOfProducts(products) {
    return _.reduce(products.map(product => product.quantity * product.original_price), (memo, num) => memo + num, 0);
  }


}
