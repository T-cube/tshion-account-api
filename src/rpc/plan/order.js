import { ObjectId } from 'mongodb';
import C from 'lib/constants';
import { ApiError } from 'lib/error';
import { strToReg } from 'lib/utils';

import RpcRoute from 'models/rpc-route';
import PlanOrderModel from '../models/plan-order';
import { getObjectId } from '../utils';

const route = RpcRoute.router();
export default route;

const orderModel = new PlanOrderModel();

route.on('/list', query => {
  let criteria = {};
  let { status, plan, page, pagesize, keyword, order_type, company_id, amount } = query;
  if (status) {
    if (status == C.ORDER_STATUS.PAYING) {
      status = {
        $in: [C.ORDER_STATUS.CREATED, C.ORDER_STATUS.PAYING]
      };
    }
    criteria.status = status;
  }
  if (plan) {
    criteria.plan = plan;
  }
  if (order_type) {
    criteria.order_type = order_type;
  }
  if (ObjectId.isValid(company_id)) {
    criteria.company_id = ObjectId(company_id);
  }
  if (PlanOrderModel.isOrderNoLike(keyword)) {
    criteria.order_no = {
      $regex: keyword
    };
  }
  if (amount && /\d+[\d,]?\d*/.test(amount)) {
    amount = amount.split(',').sort().map(i => parseInt(i));
    criteria.paid_sum = amount.length == 1 ? amount[0] : {
      $gte: amount[0],
      $lte: amount[1],
    };
  }
  return orderModel.page({page, pagesize, criteria});
});

route.on('/detail', query => {
  let order_id = getObjectId(query, 'order_id');
  return orderModel.fetchDetail(order_id)
  .then(order => {
    if (!order) {
      throw new ApiError(404);
    }
    return order;
  });
});
