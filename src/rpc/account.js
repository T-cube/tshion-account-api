import config from 'config';
import Promise from 'bluebird';
import { ObjectId } from 'mongodb';
import { ApiError } from 'lib/error';

import RpcRoute from 'models/rpc-route';
import { mapObjectIdToData, strToReg } from 'lib/utils';
import AccountModel from './models/account';
import { getObjectId } from './utils';

const route = RpcRoute.router();
export default route;

const accountModel = new AccountModel();

route.on('/list', (query) => {
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

route.on('/detail', (query) => {
  let _id = getObjectId(query, '_id');
  return accountModel.fetchDetail(ObjectId(_id))
  .then(user => {
    if (!user) {
      throw new ApiError(404);
    }
    return user;
  });
});

route.on('/detail/project', (query) => {
  return fetchSubInfo('project', query);
});

route.on('/detail/company', (query) => {
  return fetchSubInfo('company', query);
});

function fetchSubInfo(target, query) {
  let _id = getObjectId(query, '_id');
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
