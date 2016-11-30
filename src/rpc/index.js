import RpcRoute from 'models/rpc-route';

import accountRoutes from './account';
import companyRoutes from './company';
import planRoutes from './plan';

export default (socket) => {

  const rpcRoute = new RpcRoute(socket);
  const route = rpcRoute.route.bind(rpcRoute);

  route('pid', () => process.pid);

  rpcRoute.use('/account', accountRoutes);
  rpcRoute.use('/company', companyRoutes);
  rpcRoute.use('/plan', planRoutes);

};
