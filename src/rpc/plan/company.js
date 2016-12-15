import _ from 'underscore';
import { ApiError } from 'lib/error';
import C, {ENUMS} from 'lib/constants';

import RpcRoute from 'models/rpc-route';
import { getObjectId } from '../utils';
import PlanCompanyModel from '../models/plan-company';


export default (socket, prefix) => {

  const rpcRoute = new RpcRoute(socket, prefix);
  const route = rpcRoute.route.bind(rpcRoute);
  const planCompany = new PlanCompanyModel();

  route('/list', (query) => {
    let { page, pagesize, type, plan, status } = query;
    let criteria = {};
    if (type && _.contains(['trial', 'paid'], type)) {
      criteria.type = type;
    }
    if (plan && _.contains(_.values(C.TEAMPLAN_PAID), plan)) {
      criteria.plan = plan;
    }
    if (status && _.contains(ENUMS.PLAN_STATUS, status)) {
      criteria.status = status;
    }
    return planCompany.page({page, pagesize, criteria});
  });

  route('/detail', (query) => {
    let usage_id = getObjectId(query, 'usage_id');
    return planCompany.fetchDetail(usage_id)
    .then(info => {
      if (!info) {
        throw new ApiError(404);
      }
      return info;
    });
  });

};
