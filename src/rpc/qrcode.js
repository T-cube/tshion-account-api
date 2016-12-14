import { ApiError } from 'lib/error';
import RpcRoute from 'models/rpc-route';
import { validate } from './schema';

export default (socket, prefix) => {

  const rpcRoute = new RpcRoute(socket, prefix);
  const route = rpcRoute.route.bind(rpcRoute);
  const qrcodeModel = socket.model('qrcode-model');

  route('/list', (query) => {
    let { page, pagesize, status } = query;
    status = status == 'deleted' ? 'deleted' : 'normal';
    let criteria = {status};
    return qrcodeModel.page({page, pagesize, criteria});
  });

  route('/create', (query) => {
    let { name, description } = query;
    let data = { name, description };
    validate('qrcode', data);
    return qrcodeModel.create(data);
  });

  route('/update', (query) => {
    validate('qrcode', query);
    let { _id, name, description, status } = query;
    if (status) {
      return qrcodeModel.updateStatus(_id, status);
    } else if (name && description) {
      return qrcodeModel.update(_id, {name, description});
    }
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
