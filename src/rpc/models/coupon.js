import _ from 'underscore';
import { ObjectId } from 'mongodb';

import { mapObjectIdToData } from 'lib/utils';
import Model from './model';

export default class CouponModel extends Model {

  constructor(props) {
    super(props);
  }

  fetchList(props) {
    let { page, pagesize, criteria } = props;
    return this.db.payment.coupon.find(criteria)
    .skip(page * pagesize)
    .limit(pagesize)
    .sort({
      'period.date_end': 1,
      'period.date_start': 1,
    });
  }

  count(criteria) {
    return this.db.payment.coupon.count(criteria);
  }

  fetchDetail(_id) {
    return this.db.payment.coupon.findOne({_id});
  }

  create(data) {
    data.date_create = data.date_update = new Date();
    return this.db.payment.coupon.insert(data);
  }

  update(_id, data) {
    data.date_update = new Date();
    return this.db.payment.coupon.update({_id}, {
      $set: data
    });
  }

  delete(_id) {
    return this.db.payment.coupon.remove({_id});
  }

  addProduct(_id, product_no) {
    return this.db.payment.coupon.update({_id}, {
      $addToSet: {
        products: product_no
      }
    });
  }

  removeProduct(_id, product_no) {
    return this.db.payment.coupon.update({_id}, {
      $pull: {
        products: product_no
      }
    });
  }

}
