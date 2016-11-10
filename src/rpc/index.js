import RpcRoute from 'models/rpc-route';

import accountRoutes from './account';
import companyRoutes from './company';

export default (socket) => {

  const rpcRoute = new RpcRoute(socket);
  const route = rpcRoute.route.bind(rpcRoute);

  route('pid', () => process.pid);

  rpcRoute.use('/account', accountRoutes);
  rpcRoute.use('/company', companyRoutes);

};
