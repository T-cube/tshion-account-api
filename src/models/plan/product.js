import _ from 'underscore';

import db from 'lib/database';

export default class Product {

  constructor() {

  }

  create() {

  }

  static getByPlan(plan) {
    return db.payment.product.find({
      plan
    });
  }

  static getAll() {
    return db.payment.product.find({});
  }

}
