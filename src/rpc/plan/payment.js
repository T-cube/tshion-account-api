import { ObjectId } from 'mongodb';
import { ApiError } from 'lib/error';
import { strToReg } from 'lib/utils';

import RpcRoute from 'models/rpc-route';
import { validate } from '../schema/plan';
import PlanAuthModel from '../models/plan-auth';

export default (socket, prefix) => {

  const rpcRoute = new RpcRoute(socket, prefix);
  const route = rpcRoute.route.bind(rpcRoute);
  const planAuthModel = new PlanAuthModel();

  route('/list', (query) => {
    let criteria = {};
    let { status, plan, keyword } = query;
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
    let { page, pagesize } = planAuthModel.getPageInfo(query);
    return planAuthModel.page({criteria, page, pagesize});
  });

  route('/detail', (query) => {
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

  route('/discount/list', (query) => {
    validate('plan_audit', query);
    return planAuthModel.audit(query).then(() => ({ok: 1}));
  });

  route('/discount/update', (query) => {
    validate('plan_audit', query);
    return planAuthModel.audit(query).then(() => ({ok: 1}));
  });


};
