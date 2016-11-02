import RpcRoute from 'models/rpc-route';

import db from 'lib/database';

export default (socket) => {

  let prefix = '/account';
  const rpcRoute = new RpcRoute(socket, prefix);
  const route = rpcRoute.route.bind(rpcRoute);

  route('/list', (query) => {
    let { name } = query;
    throw new Error();
    return db.user.find({
      name
    }, {
      name: 1,
      email: 1,
      mobile: 1,
    });
  });

};
