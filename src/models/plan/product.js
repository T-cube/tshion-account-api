import _ from 'underscore';

import db from 'lib/database';

export default class Product {

  constructor() {

  }

  create() {

  }

  static getByPlan(plan) {
    return db.product.find({
      plan
    })
    .then(doc => {
      return {
        monthly: _.find(doc, item => item.product_type == 'monthly'),
        peruser: _.find(doc, item => item.product_type == 'peruser'),
      };
    });
  }

}
