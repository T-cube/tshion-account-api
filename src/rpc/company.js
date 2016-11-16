import Promise from 'bluebird';
import { ObjectId } from 'mongodb';
import { ApiError } from 'lib/error';
import { strToReg } from 'lib/utils';

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
        $regex: strToReg(keyword, 'i')
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

  route('/detail/project', (query) => {
    return fetchSubInfo('project', query);
  });

  route('/detail/member', (query) => {
    return fetchSubInfo('member', query);
  });

  function fetchSubInfo(target, query) {
    let { _id } = query;
    if (!_id || !ObjectId.isValid(_id)) {
      throw new ApiError(400);
    }
    let { page, pagesize } = companyModel.getPageInfo(query);
    let props = {
      _id: ObjectId(_id),
      pagesize,
      page
    };
    let fetch;
    switch (target) {
    case 'member':
      fetch = companyModel.fetchMemberList(props);
      break;
    case 'project':
      fetch = companyModel.fetchProjectList(props);
      break;
    }
    return fetch.then(doc => {
      if (null === doc) {
        throw new ApiError(404);
      }
      return doc;
    });
  }

};
