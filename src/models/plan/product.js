import _ from 'underscore';
import db from 'lib/database';
import C, {ENUMS} from 'lib/constants';

export default class Product {

  constructor() {}

  static getByPlan(plan) {
    let fields = {
      title: 1,
      plan: 1,
      product_no: 1,
      original_price: 1,
      discount: 1,
    };
    return db.payment.product.find({
      plan
    }, fields);
  }

  static getProductsWithDiscount(plan, order_type) {
    let criteria;
    if (plan && _.contains(ENUMS.TEAMPLAN_PAID, plan)) {
      criteria = {plan};
    }
    return db.payment.product.find(criteria)
    .then(products => {
      return Promise.all(products.map(product => {
        let criteria = {
          _id: {
            $in: product.discount
          },
          'period.date_start': {$lte: new Date()},
          'period.date_end': {$gte: new Date()},
        };
        if (order_type) {
          criteria.order_type = order_type;
        }
        return product.discount && db.payment.discount.find(criteria)
        .then(discount => product.discount = discount);
      }))
      .then(() => products);
    });
  }

}
