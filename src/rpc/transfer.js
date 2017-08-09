import RpcRoute from 'models/rpc-route';
import { ObjectId } from 'mongodb';
import _ from 'underscore';

import TransferModel from './models/transfer';
import { strToReg } from 'lib/utils';
import { ENUMS } from 'lib/constants';

const route = RpcRoute.router();
export default route;

const transferModel = new TransferModel();

route.on('/list', query => {
  let { page, pagesize, status, keyword } = query;
  let criteria = {};
  if (status) {
    if (!_.some(ENUMS.TRANSFER_STATUS, item => item == status)) {
      throw new Error('invalid_status');
    }
    criteria.status = status;
  }
  if (keyword) {
    criteria['$or'] = [
      {
        company_name: {
          $regex: strToReg(keyword, 'i')
        }
      },
      {
        account_name: {
          $regex: strToReg(keyword, 'i')
        }
      }
    ];
  }
  return transferModel.page({ page, pagesize, criteria});
});

route.on('/detail', query => {
  let { transfer_id } = query;
  transfer_id = ObjectId(transfer_id);
  return transferModel.detail({transfer_id});
});

route.on('/confirm', query => {
  let { transfer_id } = query;
  transfer_id = ObjectId(transfer_id);
  return transferModel.confirm({transfer_id});
});

route.on('/reject', query => {
  let { transfer_id, reason } = query;
  transfer_id = ObjectId(transfer_id);
  return transferModel.reject({transfer_id, reason});
});
