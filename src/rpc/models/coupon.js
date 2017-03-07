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
    return this._parseData(data)
    .then(data => {
      data.date_create = data.date_update = new Date();
      data.status = C.COUPON_STATUS.NORMAL;
      data.coupon_no = ('C' + ((+new Date()).toString(32).substr(2) + Math.random().toString(32).substr(2)).toUpperCase()).substr(0, 10);
      return this.db.payment.coupon.insert(data);
    });
  }

  update(_id, data) {
    return this._parseData(data)
    .then(data => {
      data = this._parseData(data);
      data.date_update = new Date();
      return this.db.payment.coupon.update({_id}, {
        $set: data
      });
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
    let {order_type, discount, criteria, products} = data;
    if (_.contains([C.ORDER_TYPE.NEWLY, C.ORDER_TYPE.RENEWAl], order_type) && discount.type == 'times') {
      throw new ApiError(400, 'only newly and renewal can have times discount');
    }
    data.criteria = _.pick(criteria, 'type', criteria.type);
    data.discount = _.pick(discount, 'type', discount.type);
    if (discount.type != 'number') {
      return Promise.resolve(data);
    }
    // 非人数续费不能有数量的优惠
    if (!products.length) {
      throw new ApiError(400, 'plan cannot has number discount');
    }
    return this.db.payment.product.count({
      _id: {
        $in: products
      },
      product_no: C.PRODUCT_NO.PLAN
    })
    .then(planProductCount => {
      if (planProductCount > 0) {
        throw new ApiError(400, 'plan cannot has number discount');
      }
      return data;
    });
  }

  distribute({coupon_no, companies}) {
    return Promise.all([
      this.db.payment.coupon.findOne({
        coupon_no: coupon_no
      }, {
        stock_current: 1,
      }),
      this.db.company.find({
        _id: {$in: companies}
      }, {
        _id: 1
      }),
    ])
    .then(([coupon, companies]) => {
      if (!coupon || !companies.length) {
        return;
      }
      companies = _.pluck(companies, '_id');
      if (coupon.stock_current < companies.length) {
        throw new ApiError(400, 'out_of_stock_coupon');
      }
      return Promise.all([
        Promise.all(companies.map(company_id => {
          return this.db.payment.coupon.item.insert({
            coupon_no: coupon.coupon_no,
            serial_no: coupon.coupon_no,
            order_type: coupon.order_type,
            company_id,
            is_used: false,
            date_create: new Date(),
            date_used: null,
            period: coupon.period
          });
        })),
        this.db.payment.coupon.update({
          _id: coupon.coupon_id,
        }, {
          $inc: {
            stock_current: -companies.length
          }
        })
      ]);
    })
    .then(() => ({ok: 1}));
  }
}
