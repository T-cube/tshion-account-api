import RpcRoute from 'models/rpc-route';

import accountRoutes from './account';
import companyRoutes from './company';
import planRoutes from './plan';
import qrcodeRoutes from './qrcode';

import QrcodeModel from './models/qrcode';

export default (socket, _loader) => {

  const route = new RpcRoute(socket, '', _loader);

  route.on('pid', () => process.pid);

  route.use('/account', accountRoutes);
  route.use('/company', companyRoutes);
  route.use('/plan', planRoutes);
  route.use('/qrcode', qrcodeRoutes);

  // bind loader
  _loader.loadModel('qrcode-model', QrcodeModel);

};
