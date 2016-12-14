import config from 'config';
import Promise from 'bluebird';
import { ObjectId } from 'mongodb';
import { ApiError } from 'lib/error';

import RpcRoute from 'models/rpc-route';
import db from 'lib/database';
import { mapObjectIdToData, strToReg } from 'lib/utils';

import AccountModel from './models/account';

export default (socket, prefix) => {

  const rpcRoute = new RpcRoute(socket, prefix);
  const route = rpcRoute.route.bind(rpcRoute);
  const accountModel = new AccountModel();

  route('/list', (query) => {
    let criteria = {};
    let { keyword } = query;
    if (keyword) {
      criteria['name'] = {
        $regex: strToReg(keyword, 'i')
      };
    }
    let { page, pagesize } = query;
    return accountModel.page({criteria, page, pagesize});
  });

  route('/detail', (query) => {
    let { _id } = query;
    if (!_id || !ObjectId.isValid(_id)) {
      throw new ApiError(400);
    }
    return accountModel.fetchDetail(ObjectId(_id))
    .then(user => {
      if (!user) {
        throw new ApiError(404);
      }
      return user;
    });
  });

  route('/detail/project', (query) => {
    return fetchSubInfo('project', query);
  });

  route('/detail/company', (query) => {
    return fetchSubInfo('company', query);
  });

  function fetchSubInfo(target, query) {
    let { _id } = query;
    if (!_id || !ObjectId.isValid(_id)) {
      throw new ApiError(400);
    }
    let { page, pagesize } = accountModel.getPageInfo(query);
    let props = {
      _id: ObjectId(_id),
      pagesize,
      page
    };
    let fetch;
    switch (target) {
    case 'company':
      fetch = accountModel.fetchCompanyList(props);
      break;
    case 'project':
      fetch = accountModel.fetchProjectList(props);
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
