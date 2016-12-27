
import db from 'lib/database';

export default class Coupon {

  constructor(company_id) {
    this.company_id = company_id;
  }

  getCoupons(order_type) {
    return db.payment.company.coupon.findOne({
      _id: this.company_id
    }, {
      list: 1
    })
    .then(doc => {
      if (!doc) {
        return [];
      }
      return db.payment.coupon.find({
        _id: {$in: doc.list.map(i => i.coupon)},
        order_type,
        'period.date_start': {$lt: new Date()},
        'period.date_end': {$gte: new Date()},
      });
    });
  }

  getCoupon(couponId) {
    return Promise.all([
      db.payment.company.coupon.count({
        _id: this.company_id,
        list: couponId
      }),
      db.payment.coupon.findOne({
        _id: couponId,
        'period.date_start': {$lt: new Date()},
        'period.date_end': {$gte: new Date()},
      })
    ])
    .then(doc => doc[0] && doc[1]);
  }

}
