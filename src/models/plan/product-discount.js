import _ from 'underscore';

import db from 'lib/database';

export default class ProductDiscount {

  constructor() {}

  static getOriginalFeeOfProducts(products) {
    return _.reduce(products.map(product => product.quantity * product.original_price), (memo, num) => memo + num, 0);
  }


}
