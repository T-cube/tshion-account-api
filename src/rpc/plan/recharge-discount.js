import { ObjectId } from 'mongodb';
import { ApiError } from 'lib/error';

import RpcRoute from 'models/rpc-route';
import { validate } from '../schema/plan';
import { getObjectId } from '../utils';
import RechargeModel from '../models/recharge-discount';


export default (socket, prefix) => {

  const rpcRoute = new RpcRoute(socket, prefix);
  const route = rpcRoute.route.bind(rpcRoute);
  const rechargeModel = new RechargeModel();

  route('/list', (query) => {
    let { page, pagesize } = query;
    return rechargeModel.page({page, pagesize});
  });

  route('/detail', (query) => {
    let discount_id = getObjectId(query, 'discount_id');
    return rechargeModel.fetchDetail(discount_id)
    .then(info => {
      if (!info) {
        throw new ApiError(404);
      }
      return info;
    });
  });

  route('/create', query => {
    validate('recharge_discount', query);
    if (query.extra_amount > query.amount) {
      throw new ApiError(400, 'extra_amount > amount');
    }
    return rechargeModel.create(query);
  });

  route('/update', query => {
    let discount_id = getObjectId(query, 'discount_id');
    validate('recharge_discount', query);
    if (query.extra_amount > query.amount) {
      throw new ApiError(400, 'extra_amount > amount');
    }
    return rechargeModel.update(discount_id, query);
  });

  route('/delete', query => {
    let discount_id = getObjectId(query, 'discount_id');
    return rechargeModel.delete(discount_id);
  });

};
