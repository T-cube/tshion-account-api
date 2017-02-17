import _ from 'underscore';
import { ObjectId } from 'mongodb';
import { ApiError } from 'lib/error';

import RpcRoute from 'models/rpc-route';
import {ENUMS} from 'lib/constants';
import { validate } from '../schema/plan';
import { getObjectId } from '../utils';
import CouponModel from '../models/coupon';
import CompanyCouponModel from '../models/company-coupon';

const route = RpcRoute.router();
export default route;

const couponModel = new CouponModel();
const companyCoupon = new CompanyCouponModel();

route.on('/list', (query) => {
  let { page, pagesize, status } = query;
  let criteria;
  if (status) {
    status = status.split(',').filter(i => _.contains(ENUMS.DISCOUNT_STATUS, i));
    criteria = {
      status: {$in: status}
    };
  }
  return couponModel.page({
    page,
    pagesize,
    criteria,
  });
});

route.on('/detail', (query) => {
  let coupon_id = getObjectId(query, 'coupon_id');
  return couponModel.fetchDetail(coupon_id)
  .then(info => {
    if (!info) {
      throw new ApiError(404);
    }
    return info;
  });
});

route.on('/create', query => {
  validate('coupon', query);
  return couponModel.create(query);
});

route.on('/update', query => {
  let coupon_id = getObjectId(query, 'coupon_id');
  validate('coupon', query);
  return couponModel.update(coupon_id, query);
});

// route.on('/product/add', query => {
//   let coupon_id = getObjectId(query, 'coupon_id');
//   let product_no = query.product_no;
//   return couponModel.addProduct(coupon_id, product_no);
// });
//
// route.on('/product/remove', query => {
//   let coupon_id = getObjectId(query, 'coupon_id');
//   let product_no = query.product_no;
//   return couponModel.removeProduct(coupon_id, product_no);
// });

route.on('/delete', query => {
  let coupon_id = getObjectId(query, 'coupon_id');
  return couponModel.delete(coupon_id);
});

route.on('/company', query => {
  let coupon_id = getObjectId(query, 'coupon_id');
  return companyCoupon.pageCompanyHasCoupon(coupon_id, query);
});

route.on('/send', query => {
  validate('send_coupon', query);
  return companyCoupon.create(query);
});
