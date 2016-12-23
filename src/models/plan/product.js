import db from 'lib/database';

export default class Product {

  constructor() {

  }

  static getByPlan(plan) {
    let fields = {
      title: 1,
      plan: 1,
      product_no: 1,
      original_price: 1,
      discounts: 1,
    };
    return db.payment.product.find({
      plan
    }, fields);
  }


}
