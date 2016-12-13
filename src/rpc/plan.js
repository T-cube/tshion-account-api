
import RpcRoute from 'models/rpc-route';

import authRoutes from './plan/auth';
import couponRoutes from './plan/coupon';
import productRoutes from './plan/product';
import paymentRoutes from './plan/payment';
import discountRoutes from './plan/discount';

export default (socket, prefix) => {

  const rpcRoute = new RpcRoute(socket, prefix);

  rpcRoute.use('/auth', authRoutes);
  rpcRoute.use('/product', productRoutes);
  rpcRoute.use('/discount', discountRoutes);
  rpcRoute.use('/coupon', couponRoutes);
  rpcRoute.use('/payment', paymentRoutes);

};
