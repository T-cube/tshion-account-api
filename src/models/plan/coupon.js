import _ from 'underscore';
import C from 'lib/constants';
import db from 'lib/database';

export default class Coupon {

  constructor(company_id) {
    this.company_id = company_id;
  }

  getCoupons(order_type) {
    return db.payment.company.coupon.findOne({
      _id: this.company_id,
    }, {
      list: 1
    })
    .then(doc => {
      if (!doc) {
        return [];
      }
      let list = doc.list.filter(i => i.status == C.COMPANY_COUPON_STATUS.UNUSED);
      if (!list.length) {
        return [];
      }
      return db.payment.coupon.find({
        _id: {$in: _.pluck(list, 'coupon')},
        order_type,
        'period.date_start': {$lt: new Date()},
        'period.date_end': {$gte: new Date()},
      }, {
        title: 1,
        description: 1,
        order_type: 1,
        criteria: 1,
        discount: 1,
        period: 1,
        coupon_no: 1,
      })
      .then(coupons => {
        coupons.forEach(coupon => {
          coupon.coupon_no = _.find(list, i => i.status == C.COMPANY_COUPON_STATUS.UNUSED && i.coupon.equals(coupon._id)).coupon_no;
        });
        return coupons;
      });
    });
  }

  getCoupon(coupon_no) {
    return db.payment.company.coupon.findOne({
      _id: this.company_id,
      list: {
        $elemMatch: {
          coupon_no,
          status: C.COMPANY_COUPON_STATUS.UNUSED
        }
      }
    }, {
      'list.$': 1
    })
    .then(doc => {
      if (!doc || !doc.list[0]) {
        return null;
      }
      let couponId = doc.list[0].coupon;
      return couponId && db.payment.coupon.findOne({
        _id: couponId,
        'period.date_start': {$lt: new Date()},
        'period.date_end': {$gte: new Date()},
      });
    });
  }

}
