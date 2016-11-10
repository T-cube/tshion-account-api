import Promise from 'bluebird';
import { ObjectId } from 'mongodb';
import { ApiError } from 'lib/error';

import RpcRoute from 'models/rpc-route';

import CompanyModel from './models/company';

export default (socket, prefix) => {

  const rpcRoute = new RpcRoute(socket, prefix);
  const route = rpcRoute.route.bind(rpcRoute);
  const companyModel = new CompanyModel();

  route('/list', (query) => {
    let { page, pagesize } = companyModel.getPageInfo(query);
    let { keyword } = query;
    let criteria = {};
    if (keyword) {
      criteria['name'] = {
        $regex: RegExp(keyword, 'i')
      };
    }
    return Promise.all([
      companyModel.count(criteria),
      companyModel.fetchList(criteria, query)
    ])
    .then(doc => {
      let [totalRows, list] = doc;
      return {
        list,
        page,
        pagesize,
        totalRows
      };
    });
  });

  route('/detail', (query) => {
    let { _id } = query;
    if (!_id || !ObjectId.isValid(_id)) {
      throw new ApiError(400);
    }
    return companyModel.fetchDetail(ObjectId(_id))
    .then(company => {
      if (!company) {
        throw new ApiError(404);
      }
      return company;
    });
  });

};
