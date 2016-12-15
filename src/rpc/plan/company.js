import _ from 'underscore';
import { ObjectId } from 'mongodb';
import { ApiError } from 'lib/error';
import C from 'lib/constants';

import RpcRoute from 'models/rpc-route';
import { validate } from '../schema/plan';
import { getObjectId } from '../utils';
import PlanCompanyModel from '../models/plan-company';


export default (socket, prefix) => {

  const rpcRoute = new RpcRoute(socket, prefix);
  const route = rpcRoute.route.bind(rpcRoute);
  const planCompany = new PlanCompanyModel();

  route('/list', (query) => {
    let { page, pagesize, type, plan } = query;
    let criteria = {};
    if (type && _.contains(['trial', 'paid'], type)) {
      criteria.type = type;
    }
    if (plan && _.contains(_.values(C.TEAMPLAN_PAID), plan)) {
      criteria.plan = plan;
    }
    return planCompany.page({page, pagesize, criteria});
  });

  route('/detail', (query) => {
    let _id = getObjectId(query, '_id');
    return planCompany.fetchDetail(_id)
    .then(info => {
      if (!info) {
        throw new ApiError(404);
      }
      return info;
    });
  });

};
