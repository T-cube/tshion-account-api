import _ from 'underscore';

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

  static isMatch(origin, criteria) {
    let { quantity, total_fee, times } = criteria;
    let result = !_.isEmpty(_.filter({quantity, total_fee, times}, (v, k) => _.isNumber(v) && origin[k] >= v));
    return result;
  }

}
