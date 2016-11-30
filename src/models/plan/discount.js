import _ from 'underscore';

export default class Discount {

  constructor() {

  }

  static getDiscount(origin, discount) {
    let { type } = discount;
    let { fee } = origin;
    if (type == 'rate' && _.isNumber(discount.rate)) {
      return {
        type,
        fee: fee * discount.rate || 0
      };
    } else if (type == 'amount' && _.isInt(discount.amount)) {
      return {
        type,
        fee: discount.amount || 0
      };
    } else if (type == 'number' && _.isInt(discount.number)) {
      return {
        type,
        number: discount.number || 0
      };
    } else if (type == 'times' && _.isNumber(discount.times)) {
      return {
        type,
        times: discount.times || 0
      };
    } else {
      return {
        type,
      };
    }
  }

}
