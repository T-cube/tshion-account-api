import { ApiError } from 'lib/error';
import RpcRoute from 'models/rpc-route';
import { validate } from './schema';

const route = RpcRoute.router();
export default route;

route.on('/list', (query, loader) => {
  let { page, pagesize, status } = query;
  status = status == 'deleted' ? 'deleted' : 'normal';
  let criteria = {status};
  return loader.model('qrcode-model').page({page, pagesize, criteria});
});

route.on('/create', (query, loader) => {
  let { name, description } = query;
  let data = { name, description };
  validate('qrcode', data);
  return loader.model('qrcode-model').create(data);
});

route.on('/update', (query, loader) => {
  validate('qrcode', query);
  let { _id, name, description, status } = query;
  const qrcodeModel = loader.model('qrcode-model');
  if (status) {
    return qrcodeModel.updateStatus(_id, status);
  } else if (name && description) {
    return qrcodeModel.update(_id, {name, description});
  } else {
    throw new ApiError(400);
  }
});

route.on('/detail', (query, loader) => {
  let { _id } = query;
  return loader.model('qrcode-model').fetchDetail(parseInt(_id))
  .then(doc => {
    if (!doc) {
      throw new ApiError(404);
    }
    return doc;
  });
});

route.on('/detail/customers', (query, loader) => {
  let { _id } = query;
  const qrcodeModel = loader.model('qrcode-model');
  let { page, pagesize } = qrcodeModel.getPageInfo(query);
  return qrcodeModel.fetchScanUsers(parseInt(_id), {page, pagesize});
});
