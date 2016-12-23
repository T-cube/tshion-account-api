import _ from 'underscore';
import db from 'lib/database';


export default class Discount {

  constructor() {

  }

  static getDiscount(origin, discountItem) {
    let { discount, criteria } = discountItem;
    if (!Discount.isMatch(origin, criteria)) {
      return null;
    }
    let { type } = discount;
    let { total_fee } = origin;
    let result = {type};
    switch (type) {
    case 'rate':
      result.fee = discount.rate > 1 ? total_fee : total_fee * discount.rate;
      break;
    case 'amount':
      result.fee = discount.amount < total_fee ? discount.amount : total_fee;
      break;
    case 'number':
      result.number = discount.number;
      break;
    case 'times':
      result.times = discount.times;
      break;
    }
    return result;
  }

  static getProductDiscount(discounts, matchs) {
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

  static isMatch(origin, criteria) {
    let { quantity, total_fee, times } = criteria;
    let result = !_.isEmpty(_.filter({quantity, total_fee, times}, (v, k) => _.isNumber(v) && origin[k] >= v));
    return result;
  }

}
