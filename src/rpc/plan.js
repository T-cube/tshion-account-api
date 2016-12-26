import RpcRoute from 'models/rpc-route';

import authRoutes from './plan/auth';
import couponRoutes from './plan/coupon';
import productRoutes from './plan/product';
import paymentRoutes from './plan/payment';
import discountRoutes from './plan/discount';
import companyRoutes from './plan/company';
import orderRoutes from './plan/order';
import rechargeDiscountRoutes from './plan/recharge-discount';

import PlanModel from './models/plan';
import { getObjectId } from './utils';
import { validate } from './schema/plan';

const route = RpcRoute.router();
export default route;

const planModel = new PlanModel();

route.use('/auth', authRoutes);
route.use('/product', productRoutes);
route.use('/discount', discountRoutes);
route.use('/recharge-discount', rechargeDiscountRoutes);
route.use('/coupon', couponRoutes);
route.use('/payment', paymentRoutes);
route.use('/company', companyRoutes);
route.use('/order', orderRoutes);

route.on('/type/list', query => {
  return planModel.page();
});

route.on('/type/detail', query => {
  let planId = getObjectId(query, 'plan_id');
  return planModel.fetchDetail(planId);
});

route.on('/type/update', query => {
  validate('update_plan', query);
  return planModel.update(query.plan_id, query);
});
