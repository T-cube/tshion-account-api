import RpcRoute from 'models/rpc-route';


import BroadcastModel from './models/broadcast';
import { getObjectId } from './utils';
import { validate } from './schema/broadcast';

const route = RpcRoute.router();
export default route;

const broadcastModel = new BroadcastModel();


route.on('/list', query => {
  let { page, pagesize, status } = query;
  let criteria = {};
  if (status) {
    criteria = {status};
  }
  return broadcastModel.page({ page, pagesize, criteria});
});

route.on('/create', query  => {
  validate('broadcast', query);
  let { title, content, link, creator } = query;
  return broadcastModel.create({ title, content, link, creator});
});

route.on('/update', query => {
  validate('broadcast_status', query);
  let { status, broadcast_id } = query;
  return broadcastModel.update({ status, broadcast_id });
});

route.on('/delete', query => {
  validate('broadcast_id', query);
  let { broadcast_id } = query;
  return broadcastModel.delete({ broadcast_id });
});
