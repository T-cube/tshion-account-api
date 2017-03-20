import _ from 'underscore';
import C from 'lib/constants';
import db from 'lib/database';

export default class Coupon {

  constructor(company_id) {
    this.company_id = company_id;
  }

  getCoupons(order_type) {
    return db.payment.coupon.item.find({
      company_id: this.company_id,
      is_used: false,
      order_type: {$in: [order_type]},
      'period.date_start': {$lte: new Date()},
      'period.date_end': {$gte: new Date()},
    })
    .then(couponsItems => {
      if (!couponsItems) {
        return [];
      }
      return db.payment.coupon.find({
        coupon_no: {$in: _.pluck(couponsItems, 'coupon_no')},
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
        products: 1
      })
      .then(coupons => {
        coupons.forEach(coupon => {
          coupon.serial_no = _.find(couponsItems, i => i.coupon_no == coupon.coupon_no ).serial_no;
        });
        return coupons;
      });
    });
  }

  getCoupon(serial_no) {
    return db.payment.coupon.item.findOne({
      company_id: this.company_id,
      serial_no: serial_no,
      is_used: false,
      'period.date_start': {$lt: new Date()},
      'period.date_end': {$gte: new Date()},
    })
    .then(couponItem => {
      if (!couponItem) {
        return null;
      }
      let coupon_no = couponItem.coupon_no;
      return coupon_no && db.payment.coupon.findOne({
        coupon_no: coupon_no,
        'period.date_start': {$lt: new Date()},
        'period.date_end': {$gte: new Date()},
      });
    });
  }

}
