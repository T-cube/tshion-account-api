import { ObjectId } from 'mongodb';
import { ApiError } from 'lib/error';

import RpcRoute from 'models/rpc-route';
import { validate } from '../schema/plan';
import { getObjectId } from '../utils';
import DiscountModel from '../models/discount';


export default (socket, prefix) => {

  const rpcRoute = new RpcRoute(socket, prefix);
  const route = rpcRoute.route.bind(rpcRoute);
  const discountModel = new DiscountModel();

  route('/list', (query) => {
    let { page, pagesize } = query;
    return discountModel.page({page, pagesize});
  });

  route('/detail', (query) => {
    let discount_id = getObjectId(query, 'discount_id');
    return discountModel.fetchDetail(discount_id)
    .then(info => {
      if (!info) {
        throw new ApiError(404);
      }
      return info;
    });
  });

  route('/create', query => {
    validate('discount', query);
    return discountModel.create(query);
  });

  route('/update', query => {
    let discount_id = getObjectId(query, 'discount_id');
    validate('discount', query);
    return discountModel.update(discount_id, query);
  });

  route('/delete', query => {
    let discount_id = getObjectId(query, 'discount_id');
    return discountModel.delete(discount_id);
  });

};
