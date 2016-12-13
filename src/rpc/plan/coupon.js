import { ObjectId } from 'mongodb';
import { ApiError } from 'lib/error';
import { strToReg } from 'lib/utils';

import RpcRoute from 'models/rpc-route';
import { validate } from '../schema/plan';
import CouponModel from '../models/coupon';

export default (socket, prefix) => {

  const rpcRoute = new RpcRoute(socket, prefix);
  const route = rpcRoute.route.bind(rpcRoute);
  const couponModel = new CouponModel();

  route('/list', (query) => {
    let criteria = {};
    let { page, pagesize } = couponModel.getPageInfo(query);
    return couponModel.page({criteria, page, pagesize});
  });

  route('/detail', (query) => {
    let { coupon_id } = query;
    if (!coupon_id || !ObjectId.isValid(coupon_id)) {
      throw new ApiError(400, 'invalid coupon_id');
    }
    return couponModel.fetchDetail(ObjectId(coupon_id))
    .then(info => {
      if (!info) {
        throw new ApiError(404);
      }
      return info;
    });
  });

  route('/create', (query) => {

  });

  route('/delete', (query) => {

  });

};
