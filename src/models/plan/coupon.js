
import db from 'lib/database';
import ProductDiscount from 'models/plan/product-discount';

export default class Coupon {

  constructor(company_id) {
    this.company_id = company_id;
  }

  getCoupons() {
    return db.company.coupon.findOne({
      _id: this.company_id
    }, {
      list: 1
    })
    .then(coupon => {
      if (!coupon) {
        return [];
      }
      return db.payment.coupon.find({
        _id: {$in: coupon.list},
        'period.date_start': {$lt: new Date()},
        'period.data_end': {$gte: new Date()},
      });
    });
  }

  getCoupon(couponId) {
    return Promise.all([
      db.company.coupon.count({
        _id: this.company_id,
        list: couponId
      }),
      db.payment.coupon.findOne({
        _id: couponId,
        'period.date_start': {$lt: new Date()},
        'period.data_end': {$gte: new Date()},
      })
    ])
    .then(doc => doc[0] && doc[1]);
  }

}
