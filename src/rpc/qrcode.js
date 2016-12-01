import config from 'config';
import Promise from 'bluebird';
import { ObjectId } from 'mongodb';
import { ApiError } from 'lib/error';

import RpcRoute from 'models/rpc-route';
import { mapObjectIdToData } from 'lib/utils';

export default (socket, prefix) => {

  const rpcRoute = new RpcRoute(socket, prefix);
  const route = rpcRoute.route.bind(rpcRoute);
  const qrcodeModel = socket.model('qrcode-model');

  route('/list', (query) => {
    let { page, pagesize } = qrcodeModel.getPageInfo(query);
    return qrcodeModel.page({page, pagesize});
  });

  route('/create', (query) => {
    let { name, description } = query;
    return qrcodeModel.create({name, description});
  });

  route('/detail', (query) => {
    let { _id } = query;
    return qrcodeModel.fetchDetail(parseInt(_id))
    .then(doc => {
      if (!doc) {
        throw new ApiError(404);
      }
      return doc;
    });
  });

  route('/detail/customers', (query) => {
    let { _id } = query;
    let { page, pagesize } = qrcodeModel.getPageInfo(query);
    return qrcodeModel.fetchScanUsers(parseInt(_id), {page, pagesize});
  });

};
