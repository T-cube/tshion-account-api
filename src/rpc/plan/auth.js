import { ObjectId } from 'mongodb';
import { ApiError } from 'lib/error';
import { strToReg } from 'lib/utils';

import RpcRoute from 'models/rpc-route';
import { validate } from '../schema/plan';
import PlanAuthModel from '../models/plan-auth';

const route = RpcRoute.router();
export default route;

const planAuthModel = new PlanAuthModel();

route.on('/list', (query) => {
  let criteria = {};
  let { status, plan, keyword, page, pagesize } = query;
  if (status) {
    status = status.split(',');
    criteria['status'] = {$in: status};
  }
  if (plan) {
    criteria['plan'] = plan;
  }
  if (keyword) {
    criteria['info.name'] = {
      $regex: strToReg(keyword, 'i')
    };
  }
  return planAuthModel.page({criteria, page, pagesize});
});

route.on('/detail', (query) => {
  let { auth_id } = query;
  if (!auth_id || !ObjectId.isValid(auth_id)) {
    throw new ApiError(400, 'invalid auth_id');
  }
  return planAuthModel.fetchDetail(ObjectId(auth_id))
  .then(info => {
    if (!info) {
      throw new ApiError(404);
    }
    return info;
  });
});

route.on('/audit', (query) => {
  validate('plan_audit', query);
  return planAuthModel.audit(query).then(() => ({ok: 1}));
});
