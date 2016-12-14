import { ObjectId } from 'mongodb';
import { ApiError } from 'lib/error';

import RpcRoute from 'models/rpc-route';
import { validate } from '../schema/plan';
import { getObjectId } from '../utils';
import CouponModel from '../models/discount';


export default (socket, prefix) => {

  const rpcRoute = new RpcRoute(socket, prefix);
  const route = rpcRoute.route.bind(rpcRoute);
  const couponModel = new CouponModel();

  route('/list', (query) => {
    let { page, pagesize } = query;
    return couponModel.page({page, pagesize});
  });

  route('/detail', (query) => {
    let coupon_id = getObjectId(query, 'coupon_id');
    return couponModel.fetchDetail(coupon_id)
    .then(info => {
      if (!info) {
        throw new ApiError(404);
      }
      return info;
    });
  });

  route('/create', query => {
    validate('coupon', query);
    return couponModel.create(query);
  });

  route('/update', query => {
    let coupon_id = getObjectId(query, 'coupon_id');
    validate('coupon', query);
    return couponModel.update(coupon_id, query);
  });

  route('/product/add', query => {
    let coupon_id = getObjectId(query, 'coupon_id');
    let product_no = query.product_no;
    return couponModel.addProduct(coupon_id, product_no);
  });

  route('/product/remove', query => {
    let coupon_id = getObjectId(query, 'coupon_id');
    let product_no = query.product_no;
    return couponModel.removeProduct(coupon_id, product_no);
  });

  route('/delete', query => {
    let coupon_id = getObjectId(query, 'coupon_id');
    return couponModel.delete(coupon_id);
  });

};
