import RpcRoute from 'models/rpc-route';

import accountRoutes from './account';
import companyRoutes from './company';
import planRoutes from './plan';
import qrcodeRoutes from './qrcode';
import broadcastRoutes from './broadcast';
import transferRoutes from './transfer';
import appCenterRoutes from './app-center';

import QrcodeModel from './models/qrcode';
import PlanAuthModel from './models/plan-auth';

export default (socket, _loader) => {

  const route = new RpcRoute(socket, '', _loader);
  route.on('pid', () => process.pid);

  route.use('/account', accountRoutes);
  route.use('/company', companyRoutes);
  route.use('/plan', planRoutes);
  route.use('/qrcode', qrcodeRoutes);
  route.use('/broadcast', broadcastRoutes);
  route.use('/transfer', transferRoutes);
  route.use('/app-center', appCenterRoutes);

  // bind loader
  _loader.loadModel('qrcode-model', QrcodeModel);
  _loader.loadModel('plan-auth', PlanAuthModel);

};
