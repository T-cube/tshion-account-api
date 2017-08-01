import RpcRoute from 'models/rpc-route';
import { ObjectId } from 'mongodb';

import TransferModel from './models/transfer';
import { strToReg } from 'lib/utils';

const route = RpcRoute.router();
export default route;

const transferModel = new TransferModel();

route.on('/list', query => {
  let { page, pagesize, status, keyword } = query;
  let criteria = {};
  if (status) {
    criteria.status = status;
  }
  if (keyword) {
    criteria['company_name'] = {
      $regex: strToReg(keyword, 'i')
    };
  }
  return transferModel.page({ page, pagesize, criteria});
});

route.on('/confirm', query => {
  let { transfer_id } = query;
  transfer_id = ObjectId(transfer_id);
  return transferModel.confirm({transfer_id});
});

route.on('/reject', query => {
  let { transfer_id } = query;
  transfer_id = ObjectId(transfer_id);
  return transferModel.reject({transfer_id});
});
