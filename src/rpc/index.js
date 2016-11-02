import RpcRoute from 'models/rpc-route';

import accountRoutes from './account';

export default (socket) => {

  const rpcRoute = new RpcRoute(socket);
  const route = rpcRoute.route.bind(rpcRoute);

  route('pid', () => process.pid);

  rpcRoute.use(accountRoutes);

};
