import RpcRoute from 'models/rpc-route';


import TransferModel from './models/transfer';

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
    criteria['name'] = {
      $regex: strToReg(keyword, 'i')
    };
  }
  return transferModel.fetchList({ page, pagesize, criteria});
});

route.on('/confirm', query => {
  let { transfer_id } = query;
  return transferModel.
});
