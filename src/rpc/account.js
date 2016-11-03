import RpcRoute from 'models/rpc-route';

import db from 'lib/database';

export default (socket, prefix) => {

  const rpcRoute = new RpcRoute(socket, prefix);
  const route = rpcRoute.route.bind(rpcRoute);

  route('/list', (query) => {
    let { page, pagesize } = query;
    return db.user.find({}, {
      name: 1,
      email: 1,
      mobile: 1,
    });
  });

  route('/detail', (query) => {
    let { user } = query;
    return db.user.findOne({
      _id: user
    }, {
      name: 1,
      email: 1,
      mobile: 1,
    });
  });

};
