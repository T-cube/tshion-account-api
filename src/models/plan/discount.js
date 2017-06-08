import _ from 'underscore';
import db from 'lib/database';
import C from 'lib/constants';

export default class Discount {

  constructor() {}

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

  static getProductDiscount(order_type, discountIds, matchs) {
    let criteria = {
      _id: {
        $in: discountIds
      },
      order_type,
      status: C.DISCOUNT_STATUS.NORMAL,
      'period.date_start': {$lte: new Date()},
      'period.date_end': {$gte: new Date()},
    };
    let {quantity, total_fee, times} = matchs;
    criteria['$or'] = [
      {
        'criteria.quantity': {$lte: quantity || 0}
      },
      {
        'criteria.total_fee': {$lte: total_fee || 0}
      },
      {
        'criteria.times': {$lte: times || 0}
      }
    ];
    return db.payment.discount.find(criteria)
    // .sort({
    //   'criteria.quantity': 1,
    //   'criteria.total_fee': 1,
    //   'criteria.times': 1,
    // })
    // .limit(1)
    .then(list => {
      // doc[0];
      return list;
    });
  }

  static isMatch(origin, criteria) {
    for (let i in criteria) {
      if (_.contains(['quantity', 'total_fee', 'times'], i)) {
        return origin[i] && origin[i] >= criteria[i];
      }
    }
  }

}
