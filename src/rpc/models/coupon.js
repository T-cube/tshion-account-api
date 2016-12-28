import _ from 'underscore';
import { ObjectId } from 'mongodb';

import C from 'lib/constants';
import { ApiError } from 'lib/error';
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
      'period.date_end': -1,
      'period.date_start': -1,
    });
  }

  count(criteria) {
    return this.db.payment.coupon.count(criteria);
  }

  fetchDetail(_id) {
    return this.db.payment.coupon.findOne({_id});
  }

  create(data) {
    data = this._parseData(data);
    data.date_create = data.date_update = new Date();
    data.status = C.COUPON_STATUS.NORMAL;
    data.coupon_no = ('C' + ((+new Date()).toString(32).substr(2) + Math.random().toString(32).substr(2)).toUpperCase()).substr(0, 10);
    return this.db.payment.coupon.insert(data);
  }

  update(_id, data) {
    data = this._parseData(data);
    data.date_update = new Date();
    return this.db.payment.coupon.update({_id}, {
      $set: data
    });
  }

  archive(_id) {
    return this.db.payment.coupon.update({_id}, {
      $set: {status: C.COUPON_STATUS.ARCHIVED}
    });
  }

  delete(_id) {
    return this.db.payment.coupon.update({_id}, {
      $set: {status: C.COUPON_STATUS.DELETED}
    });
  }

  // addProduct(_id, product_no) {
  //   return this.db.payment.coupon.update({_id}, {
  //     $addToSet: {
  //       products: product_no
  //     }
  //   });
  // }
  //
  // removeProduct(_id, product_no) {
  //   return this.db.payment.coupon.update({_id}, {
  //     $pull: {
  //       products: product_no
  //     }
  //   });
  // }

  _parseData(data) {
    let {order_type, discount, criteria} = data;
    if (_.contains([C.ORDER_TYPE.NEWLY, C.ORDER_TYPE.RENEWAl], order_type) && discount.type == 'times') {
      throw new ApiError(400, 'only newly and renewal can have times discount');
    }
    data.criteria = _.pick(criteria, 'type', criteria.type);
    data.discount = _.pick(discount, 'type', discount.type);
    return data;
  }

}
