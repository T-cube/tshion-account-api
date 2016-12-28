import _ from 'underscore';
import { mapObjectIdToData } from 'lib/utils';
import Model from './model';

import {ApiError} from 'lib/error';

export default class CompanyCouponModel extends Model {

  constructor(props) {
    super(props);
  }

  pageCompanyCoupon(props) {
    let {company_id} = props;
    let { page, pagesize } = this.getPageInfo(props);
    return this.db.payment.company.coupon.findOne({
      _id: company_id
    })
    .then(doc => {
      return mapObjectIdToData(
        {
          list: doc ? doc.list.slice(page * pagesize, (page + 1) * pagesize) : [],
          page,
          pagesize,
          totalRows: doc ? doc.list.length : 0
        },
        'payment.coupon', '', 'list'
      );
    });
  }

  pageCompanyHasCoupon(coupon_id, query) {
    let { page, pagesize } = this.getPageInfo(query);
    let criteria = {
      'list.coupon': coupon_id
    };
    return Promise.all([
      this.db.payment.company.coupon.find(criteria, {
        _id: 1
      })
      .skip(page * pagesize)
      .limit(pagesize)
      .then(doc => {
        let companys = doc.map(item => item._id);
        return this.db.company.find({
          _id: {$in: companys}
        }, {
          name: 1,
          description: 1,
          logo: 1,
          date_create: 1,
        });
      }),
      this.db.payment.company.coupon.count(criteria)
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
      coupons = coupons.map(i => ({
        coupon: i._id,
        coupon_no: i.coupon_no + (+new Date()).toString(32).substr(-6).toUpperCase(),
        date_create
      }));
      let date_create = new Date();
      return Promise.all([
        this.db.payment.company.coupon.update({
          _id: {$in: companies},
        }, {
          $push: {
            list: {$each: coupons}
          }
        }, {
          upsert: true,
          multi: true,
        }),
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
