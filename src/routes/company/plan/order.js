import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';

import C from 'lib/constants';
import { ApiError } from 'lib/error';
import { validate } from './schema';
import Order from 'models/plan/order';
import UpgradeOrder from 'models/plan/upgrade-order';
import Auth from 'models/plan/auth';
import Payment from 'models/plan/payment';
import Product from 'models/plan/product';

let api = express.Router();

export default api;


api.get('/', (req, res, next) => {

});

api.post(/\/(prepare\/?)?$/, (req, res, next) => {
  let data = req.body;
  validate('create_order', data);
  let isPrepare = /prepare$/.test(req.url);
  let { plan, products, coupon, times, order_type } = data;
  let company_id = req.company._id;
  let user_id = req.user._id;

  new Auth(req.company._id).isPlanAuthed(plan)
  .then(isAuthed => {
    if (!isAuthed) {
      throw new ApiError(400, 'team_not_authed');
    }
    return Product.getByPlan(plan);
  })
  .then(planProducts => {
    if (!planProducts) {
      throw new ApiError(400, 'product_not_accessable');
    }
    products = planProducts
      .filter(product => _.contains(_.pluck(products, 'product_no'), product.product_no))
      .map(product => {
        product.quantity = _.find(products, item => item.product_no == product.product_no).quantity || 1;
        return product;
      });

    let props = {company_id, user_id, plan};
    let orderModel = order_type == C.PAYMENT.ORDER.TYPE.UPGRADE
      ? new UpgradeOrder(props)
      : new Order(props);

    orderModel.setProducts(products);
    if (coupon) {
      orderModel.withCoupon(coupon);
    }
    if (times) {
      orderModel.setTimes(times);
    }
    if (isPrepare) {
      return Promise.all([
        orderModel.prepare(),
        orderModel.getCoupons(),
      ])
      .then(([info, coupons]) => {
        info.coupons = coupons;
        res.json(info);
      });
    }
    return orderModel.save().then(order_id => res.json({order_id}));
  })
  .catch(next);
});

api.get('/pending', (req, res, next) => {
  let orderModel = new Order({
    company_id: req.company._id,
    user_id: req.user._id,
  });
  orderModel.getPendingOrder()
  .then(pendingOrder => {
    res.json(pendingOrder);
  })
  .catch(next);
});

api.get('/payment', (req, res, next) => {
  let methods = new Payment().getMethods();
  res.json(methods);
});

api.post('/:orderId/pay', (req, res, next) => {
  let { payment_method } = req.body;
  let orderId = ObjectId(req.params.orderId);
  Order.pay(orderId, payment_method)
  .then(doc => res.json(doc))
  .catch(next);
});
