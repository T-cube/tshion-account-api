import Promise from 'bluebird';
import { ObjectId } from 'mongodb';
import { ApiError } from 'lib/error';
import { strToReg } from 'lib/utils';

import RpcRoute from 'models/rpc-route';
import { validate } from './schema';
import PlanAuthModel from './models/plan-auth';

export default (socket, prefix) => {

  const rpcRoute = new RpcRoute(socket, prefix);
  const route = rpcRoute.route.bind(rpcRoute);
  const planAuthModel = new PlanAuthModel();

  route('/auth/list', (query) => {
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

  route('/auth/detail', (query) => {
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

  route('/auth/audit', (query) => {
    validate('plan_audit', query);
    return planAuthModel.audit(query).then(() => ({ok: 1}));
  });

};
