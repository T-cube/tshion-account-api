import _ from 'underscore';
import Promise from 'bluebird';

import Model from './model';
import C from 'lib/constants';
import { mapObjectIdToData } from 'lib/utils';
import {ApiError} from 'lib/error';

export default class CompanyCouponModel extends Model {

  constructor(props) {
    super(props);
  }

  pageCompanyCoupon(company_id, query) {
    let { page, pagesize } = this.getPageInfo(query);
    return this.db.payment.coupon.item.find({
      _id: company_id,
    })
    .then(couponsItems => {
      return {coupons: couponsItems, page, pagesize, totalRows: couponsItems ? couponsItems.length : 0};
    });
  }

  pageCompanyHasCoupon(coupon_no, query) {
    let { page, pagesize } = this.getPageInfo(query);
    let criteria = {
      coupon_no
    };
    return Promise.all([
      this.db.payment.coupon.item.find(criteria, {
        _id: 1
      })
      .skip(page * pagesize)
      .limit(pagesize)
      .then(couponItem => {
        let companys = couponItem.map(item => item.company_id);
        return this.db.company.find({
          _id: {$in: companys}
        }, {
          name: 1,
          description: 1,
          logo: 1,
          date_create: 1,
        });
      }),
      this.db.payment.coupon.item.count(criteria)
    ])
    .then(([list, totalRows]) => {
      return {
        list,
        page,
        pagesize,
        totalRows
      };
    });
  }

  create({coupons, companies}) {
    return Promise.all([
      this.db.payment.coupon.find({
        _id: {$in: coupons}
      }, {
        coupon_no: 1,
        stock_current: 1,
      }),
      this.db.company.find({
        _id: {$in: companies}
      }, {
        _id: 1
      }),
    ])
    .then(([coupons, companies]) => {
      if (!coupons.length || !companies.length) {
        return;
      }
      companies = _.pluck(companies, '_id');
      let out_of_stock_coupon = _.pluck(coupons.filter(coupon => coupon.stock_current < companies.length), '_id');
      if (out_of_stock_coupon.length) {
        throw new ApiError(400, {out_of_stock_coupon});
      }
      let date_create = new Date();
      return Promise.all([
        Promise.all(companies.map(company_id => {
          return this.db.payment.company.coupon.update({
            _id: company_id,
          }, {
            $push: {
              list: {
                $each: coupons.map(i => ({
                  coupon: i._id,
                  coupon_no: i.coupon_no + (+new Date()).toString(32).substr(-6).toUpperCase(),
                  status: C.COMPANY_COUPON_STATUS.UNUSED,
                  date_create,
                }))
              }
            }
          }, {
            upsert: true,
          });
        })),
        this.db.payment.coupon.update({
          _id: {$in: _.pluck(coupons, 'coupon')},
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
