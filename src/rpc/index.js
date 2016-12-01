import RpcRoute from 'models/rpc-route';

import accountRoutes from './account';
import companyRoutes from './company';
import qrcodeRoutes from './qrcode';

import QrcodeModel from './models/qrcode';


export default (socket) => {

  // bind loader
  socket.loadModel('qrcode-model', QrcodeModel);

  const rpcRoute = new RpcRoute(socket, null);
  const route = rpcRoute.route.bind(rpcRoute);

  route('pid', () => process.pid);

  rpcRoute.use('/account', accountRoutes);
  rpcRoute.use('/company', companyRoutes);
  rpcRoute.use('/qrcode', qrcodeRoutes);

};
