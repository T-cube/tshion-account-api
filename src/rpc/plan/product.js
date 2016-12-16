import { ObjectId } from 'mongodb';
import { ApiError } from 'lib/error';

import RpcRoute from 'models/rpc-route';
import { validate } from '../schema/plan';
import ProductModel from '../models/product';

const route = RpcRoute.router();
export default route;
const productModel = new ProductModel();

route.on('/list', (query) => {
  return productModel.page(query);
});

route.on('/detail', (query) => {
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

route.on('/update', query => {
  validate('update_product', query);
  return productModel.update(query.product_id, query);
});

route.on('/discount/add', query => {
  validate('product_discount', query);
  let { product_id, discount_id } = query;
  return productModel.addDiscount(product_id, discount_id);
});

route.on('/discount/remove', query => {
  validate('product_discount', query);
  let { product_id, discount_id } = query;
  return productModel.removeDiscount(product_id, discount_id);
});
