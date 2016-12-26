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

  create({coupon_id, company_id}) {
    return this.db.payment.coupon.findOne({
      _id: coupon_id
    }, {coupon_no: 1})
    .then(coupon => {
      if (!coupon) {
        throw new ApiError(400, 'invalid_coupon');
      }
      let randomStr = (+new Date()).toString(32).substr(-6).toUpperCase();
      return this.db.payment.company.coupon.update({
        _id: company_id,
      }, {
        $addToSet: {
          list: {
            coupon: coupon_id,
            coupon_no: coupon.coupon_no + randomStr,
            date_create: new Date()
          }
        }
      }, {
        upsert: true
      });
    });
  }

}
