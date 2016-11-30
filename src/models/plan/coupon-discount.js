import _ from 'underscore';

import db from 'lib/database';
import ProductDiscount from 'models/plan/product-discount';

export default class Coupon {

  static getOrderDiscount(orderFee, times, coupon) {
    return db.product.discount.find({
      'period.date_start': {$lte: new Date()},
      'period.date_end': {$gte: new Date()},
      $or: [
        {
          'criteria.times': {$lte: times}
        },
        {
          'criteria.total_fee': {$lte: orderFee}
        }
      ]
    })
    .then(discountList => {
      let discountResultList = discountList.map(discountInfo => {
        let { discount } = discountInfo;
        if (discount.rate !== undefined) {
          discountInfo.total_discount = orderFee * discount.rate || 0;
        } else if (discount.amount !== undefined) {
          discountInfo.total_discount = discount.amount || 0;
        } else {
          discountInfo.total_discount = 0;
        }
        return discountInfo;
      });
      return _.sortBy(discountResultList, 'total_discount')[0] || 0;
    });
  }

}
