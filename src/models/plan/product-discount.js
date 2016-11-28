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
    let totalFee = _.reduce(products.map(product => product.discount_total_price), (memo, num) => memo + num, 0);
    return db.product.discount.find({
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
          discountInfo.total_discount = totalFee * discount.rate;
        } else if (discount.amount !== undefined) {
          discountInfo.total_discount = discount.amount;
        }
        return discountInfo;
      });
      return _.sortBy(discountResultList, 'total_discount')[0];
    });
  }


}
