
import RpcRoute from 'models/rpc-route';

import authRoutes from './plan/auth';
import couponRoutes from './plan/coupon';
import productRoutes from './plan/product';
import paymentRoutes from './plan/payment';
import discountRoutes from './plan/discount';

import PlanModel from './models/plan';
import { getObjectId } from './utils';
import { validate } from './schema/plan';


export default (socket, prefix) => {

  const rpcRoute = new RpcRoute(socket, prefix);
  const route = rpcRoute.route.bind(rpcRoute);

  const planModel = new PlanModel();

  rpcRoute.use('/auth', authRoutes);
  rpcRoute.use('/product', productRoutes);
  rpcRoute.use('/discount', discountRoutes);
  rpcRoute.use('/coupon', couponRoutes);
  rpcRoute.use('/payment', paymentRoutes);

  route('/type/list', query => {
    return planModel.page();
  });

  route('/type/detail', query => {
    let planId = getObjectId(query, 'plan_id');
    return planModel.fetchDetail(planId);
  });

  route('/type/update', query => {
    validate('update_plan', query);
    return planModel.update(query.plan_id, query);
  });

};
