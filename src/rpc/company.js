import { ObjectId } from 'mongodb';
import { ApiError } from 'lib/error';
import { strToReg } from 'lib/utils';

import RpcRoute from 'models/rpc-route';

import CompanyModel from './models/company';
import CompanyCouponModel from './models/company-coupon';
import { getObjectId } from './utils';

const route = RpcRoute.router();
export default route;

const companyModel = new CompanyModel();
const companyCoupon = new CompanyCouponModel();

route.on('/list', (query) => {
  let { keyword } = query;
  let criteria = {};
  if (keyword) {
    criteria['name'] = {
      $regex: strToReg(keyword, 'i')
    };
  }
  let { page, pagesize } = query;
  return companyModel.page({criteria, page, pagesize});
});

route.on('/detail', (query) => {
  let _id = getObjectId(query, '_id');
  return companyModel.fetchDetail(ObjectId(_id))
  .then(company => {
    if (!company) {
      throw new ApiError(404);
    }
    return company;
  });
});

route.on('/detail/project', (query) => {
  return fetchSubInfo('project', query);
});

route.on('/detail/member', (query) => {
  return fetchSubInfo('member', query);
});

route.on('/detail/coupon', (query) => {
  let _id = getObjectId(query, '_id');
  return companyCoupon.pageCompanyCoupon(_id, query);
});

function fetchSubInfo(target, query) {
  let _id = getObjectId(query, '_id');
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
