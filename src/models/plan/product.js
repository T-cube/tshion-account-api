import _ from 'underscore';

import db from 'lib/database';
import { mapObjectIdToData } from 'lib/utils';

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

  static getDiscount(discounts, matchs) {
    let criteria = {
      _id: {
        $in: discounts
      },
      'period.date_start': {$lte: new Date()},
      'period.date_end': {$gte: new Date()},
    };
    if (!matchs) {
      return db.payment.discount.find(criteria);
    }
    let {quantity, total_fee} = matchs;
    criteria['$or'] = [
      {
        'criteria.quantity': {$lte: quantity || 0}
      },
      {
        'criteria.total_fee': {$lte: total_fee || 0}
      }
    ];
    return db.payment.discount.find(criteria)
    .sort({
      'criteria.quantity': 1,
      'criteria.total_fee': 1,
    })
    .limit(1)
    .then(doc => doc[0]);
  }

  static getAll() {
    return db.payment.product.find({});
  }

}
