import { ObjectId } from 'mongodb';
import { ApiError } from 'lib/error';

import RpcRoute from 'models/rpc-route';
import { validate } from '../schema/plan';
import ProductModel from '../models/product';

export default (socket, prefix) => {

  const rpcRoute = new RpcRoute(socket, prefix);
  const route = rpcRoute.route.bind(rpcRoute);
  const productModel = new ProductModel();

  route('/list', (query) => {
    return productModel.page(query);
  });

  route('/detail', (query) => {
    let { product_id } = query;
    if (!product_id || !ObjectId.isValid(product_id)) {
      throw new ApiError(400, 'invalid product_id');
    }
    return productModel.fetchDetail(ObjectId(product_id))
    .then(info => {
      if (!info) {
        throw new ApiError(404);
      }
      return info;
    });
  });

  route('/update', query => {
    validate('update_product', query);
    return productModel.update(query.product_id, query);
  });

  route('/discount/add', query => {
    validate('product_discount', query);
    let { product_id, discount_id } = query;
    return productModel.addDiscount(product_id, discount_id);
  });

  route('/discount/remove', query => {
    validate('product_discount', query);
    let { product_id, discount_id } = query;
    return productModel.removeDiscount(product_id, discount_id);
  });

};
