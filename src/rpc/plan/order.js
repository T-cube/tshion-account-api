import { ObjectId } from 'mongodb';
import { ApiError } from 'lib/error';
import { strToReg } from 'lib/utils';

import RpcRoute from 'models/rpc-route';
import { validate } from '../schema/plan';
import PlanOrderModel from '../models/plan-order';
import { getObjectId } from '../utils';

const route = RpcRoute.router();
export default route;


route.on('/list', (query, loader) => {
  let criteria = {};
  let { status, plan, page, pagesize, order_no, company } = query;
  if (status) {
    status = status.split(',');
    criteria['status'] = {$in: status};
  }
  if (plan) {
    criteria['plan'] = plan;
  }

});

route.on('/detail', (query, loader) => {
  let order_id = getObjectId(query, 'order_id');

});
