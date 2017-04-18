import _ from 'underscore';
import { ObjectId } from 'mongodb';

import C from 'lib/constants';
import { ApiError } from 'lib/error';
import { mapObjectIdToData } from 'lib/utils';
import Model from './model';
import crypto from 'crypto';

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
      throw new ApiError(400, 'plan_cannot_has_number_discount');
    }
    return this.db.payment.product.count({
      _id: {
        $in: products
      },
      product_no: C.PRODUCT_NO.PLAN
    })
    .then(planProductCount => {
      if (planProductCount > 0) {
        throw new ApiError(400, 'plan_cannot_has_number_discount');
      }
      return data;
    });
  }

  distributeCompany({coupon_no, companies}) {
    return Promise.all([
      this.db.payment.coupon.findOne({
        coupon_no: coupon_no,
        'period.date_start': {$lt: new Date()},
        'period.date_end': {$gte: new Date()},
      }),
      this.db.company.find({
        _id: {$in: companies}
      }, {
        _id: 1
      }),
    ])
    .then(([coupon, companies]) => {
      if (!coupon || !companies.length) {
        throw new ApiError(400, 'coupon_out_of_date');
        // return;
      }
      companies = _.pluck(companies, '_id');
      if (coupon.stock_current < companies.length) {
        throw new ApiError(400, 'out_of_stock_coupon');
      }
      console.log(coupon, companies.length);
      return Promise.all([
        Promise.all(companies.map(company_id => {
          let buffer = crypto.randomBytes(16).toString('hex');
          let serial_no = coupon.coupon_no + buffer;
          return this.db.payment.coupon.item.insert({
            coupon_no: coupon.coupon_no,
            serial_no: serial_no.toUpperCase(),
            order_type: coupon.order_type,
            company_id,
            is_used: false,
            date_create: new Date(),
            date_used: null,
            period: coupon.period
          });
        })),
        this.db.payment.coupon.update({
          _id: coupon._id,
        }, {
          $inc: {
            stock_current: -companies.length
          }
        })
      ]);
    })
    .then(() => ({ok: 1}));
  }

  distributeUsers({coupon_no, users}) {
    return Promise.all([
      this.db.payment.coupon.findOne({
        coupon_no: coupon_no
      }),
      this.db.user.find({
        _id: {$in: users}
      }, {
        _id: 1
      }),
    ])
    .then(([coupon, users]) => {
      if (!coupon || !users.length) {
        return;
      }
      users = _.pluck(users, '_id');
      if (coupon.stock_current < users.length) {
        throw new ApiError(400, 'out_of_stock_coupon');
      }
      return Promise.all([
        Promise.all(users.map(user_id => {
          let buffer = crypto.randomBytes(64).toString('hex');
          let serial_no = coupon.coupon_no + buffer;
          return this.db.payment.coupon.item.insert({
            coupon_no: coupon.coupon_no,
            serial_no: serial_no.toUpperCase(),
            order_type: coupon.order_type,
            user_id,
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
            stock_current: -users.length
          }
        })
      ]);
    })
    .then(() => ({ok: 1}));
  }

  companyFetchList(props) {
    let { page, pagesize, criteria } = props;
    return this.db.company.aggregate([
      { $match: criteria },
      {
        $project: {
          name: 1,
          description: 1,
          owner: 1,
          logo: 1,
          date_create: 1,
          member_count: {$size: '$members'},
          project_count: {$size: '$projects'},
        }
      },
      { $sort: {_id: -1}},
      { $skip: page * pagesize },
      { $limit: pagesize },
    ])
    .then(list=>{
      return Promise.all(list.map(item => {
        return this.db.payment.coupon.item.find({company_id: item._id})
        .then(coupons => {
          item.coupons = coupons;
          return Promise.resolve(item);
        });
      }));
    });
  }

  companyCount(criteria) {
    return this.db.company.count(criteria);
  }

  listWithCoupon(props = {}) {
    let { criteria } = props;
    let { page, pagesize } = this.getPageInfo(props);
    return Promise.all([
      this.companyCount(criteria),
      this.companyFetchList({criteria, page, pagesize})
    ])
    .then(([totalRows, list]) => {
      return {
        list,
        page,
        pagesize,
        totalRows
      };
    });
  }
}
