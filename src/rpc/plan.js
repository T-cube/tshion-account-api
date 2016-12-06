import Promise from 'bluebird';
import { ObjectId } from 'mongodb';
import { ApiError } from 'lib/error';
import { strToReg } from 'lib/utils';

import RpcRoute from 'models/rpc-route';

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
      if (status.length > 1) {
        criteria['status'] = {$in: status};
      } else {
        criteria['status'] = status[0];
      }
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
    let { auth_id, status, comment, operator_id } = query;
    if (!auth_id || !ObjectId.isValid(auth_id) || !operator_id || ObjectId.isValid(operator_id)) {
      throw new ApiError(400);
    }
    // TODO validate
    auth_id = ObjectId(auth_id);
    return planAuthModel.audit({auth_id, status, comment, operator_id}).then(() => ({ok: 1}));
  });

};
