import { ObjectId } from 'mongodb';
import C from 'lib/constants';
import { ApiError } from 'lib/error';
import { strToReg } from 'lib/utils';

import RpcRoute from 'models/rpc-route';
import RechargeModel from '../models/recharge';
import { getObjectId } from '../utils';

const route = RpcRoute.router();
export default route;

const rechargeModel = new RechargeModel();

route.on('/list', query => {
  let criteria = {};
  let { status, page, pagesize, keyword, company_id, amount } = query;
  if (status) {
    if (status == C.ORDER_STATUS.PAYING) {
      status = {
        $in: [C.ORDER_STATUS.CREATED, C.ORDER_STATUS.PAYING]
      };
    }
    criteria.status = status;
  }
  if (ObjectId.isValid(company_id)) {
    criteria.company_id = ObjectId(company_id);
  }
  if (RechargeModel.isRechargeNoLike(keyword)) {
    criteria.recharge_no = {
      $regex: keyword
    };
  }
  if (amount && /\d+[\d,]?\d*/.test(amount)) {
    amount = amount.split(',').sort().map(i => parseInt(i));
    criteria.paid_sum = amount.length == 1 ? amount : {
      $gte: amount[0],
      $lte: amount[1],
    };
  }
  return rechargeModel.page({page, pagesize, criteria});
});

route.on('/detail', query => {
  let recharge_id = getObjectId(query, 'recharge_id');
  return rechargeModel.fetchDetail(recharge_id)
  .then(doc => {
    if (!doc) {
      throw new ApiError(404);
    }
    return doc;
  });
});
