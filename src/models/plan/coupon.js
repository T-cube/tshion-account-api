
import db from 'lib/database';
import ProductDiscount from 'models/plan/product-discount';

export default class Coupon {

  constructor() {}

  create(data) {
    return db.plan.coupon.insert(data);
  }

  delete(_id) {
    return db.plan.coupon.remove({_id});
  }

  getDiscount(order) {
    let { products, quantity } = order;
    let totalFee = ProductDiscount.getOriginalFeeOfProducts(products);
    return db.plan.coupon.find({
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
    .then(couponList => {

    });
  }

}
