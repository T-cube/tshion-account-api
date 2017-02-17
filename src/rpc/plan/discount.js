import _ from 'underscore';
import { ObjectId } from 'mongodb';
import { ApiError } from 'lib/error';

import RpcRoute from 'models/rpc-route';
import {ENUMS} from 'lib/constants';
import { validate } from '../schema/plan';
import { getObjectId } from '../utils';
import DiscountModel from '../models/discount';

const route = RpcRoute.router();
export default route;
const discountModel = new DiscountModel();

route.on('/list', (query) => {
  let { page, pagesize, status } = query;
  let criteria;
  if (status) {
    status = status.split(',').filter(i => _.contains(ENUMS.DISCOUNT_STATUS, i));
    criteria = {
      status: {$in: status}
    };
  }
  return discountModel.page({
    page,
    pagesize,
    criteria,
  });
});

route.on('/detail', (query) => {
  let discount_id = getObjectId(query, 'discount_id');
  return discountModel.fetchDetail(discount_id)
  .then(info => {
    if (!info) {
      throw new ApiError(404);
    }
    return info;
  });
});

route.on('/create', query => {
  validate('discount', query);
  return discountModel.create(query);
});

route.on('/update', query => {
  let discount_id = getObjectId(query, 'discount_id');
  validate('discount', query);
  return discountModel.update(discount_id, query);
});

route.on('/delete', query => {
  let discount_id = getObjectId(query, 'discount_id');
  return discountModel.delete(discount_id);
});
