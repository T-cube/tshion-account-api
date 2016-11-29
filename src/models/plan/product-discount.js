import _ from 'underscore';

import db from 'lib/database';

export default class ProductDiscount {

  constructor() {}

  create(data) {
    return db.product.discount.insert(data);
  }

  delete(_id) {
    return db.product.discount.remove({_id});
  }

  static getDiscount(products, quantity) {
    let totalFee = ProductDiscount.getOriginalFeeOfProducts(products);
    return db.product.discount.find({
      'period.date_start': {$lte: new Date()},
      'period.date_end': {$gte: new Date()},
      $or: [
        {
          'criteria.quantity': {$lte: quantity}
        },
        {
          'criteria.total_fee': {$lte: totalFee}
        }
      ]
    })
    .then(discountList => {
      let discountResultList = discountList.map(discountInfo => {
        let { discount } = discountInfo;
        if (discount.rate !== undefined) {
          discountInfo.total_discount = totalFee * discount.rate || 0;
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

  static getOriginalFeeOfProducts(products) {
    return _.reduce(products.map(product => product.quantity * product.original_price), (memo, num) => memo + num, 0);
  }


}
