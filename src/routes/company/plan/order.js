import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';

import { ApiError } from 'lib/error';
import { validate } from './schema';
import Order from 'models/plan/order';
import Auth from 'models/plan/auth';
import Payment from 'models/plan/payment';
import Product from 'models/plan/product';

let api = express.Router();

export default api;


api.get('/', (req, res, next) => {

});

api.post(/\/(prepare)?$/, (req, res, next) => {
  let isPrepare = /prepare$/.test(req.url);
  let data = req.body;
  validate('create_order', data);
  let { coupon } = data;
  let { plan, products } = data;
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
    products = products.map(product => {
      let productInfo = _.find(planProducts, item => item.product_no == product.product_no);
      return productInfo && Object.assign({}, productInfo, product);
    }).filter(i => i);
    let orderModel = new Order({
      company_id: req.company._id,
      user_id: req.user._id,
    });
    orderModel.setProducts(products);
    if (coupon) {
      orderModel.withCoupon(coupon);
    }
    if (isPrepare) {
      return Promise.all([
        orderModel.getCoupons(),
        orderModel.prepare()
      ])
      .then(doc => res.json({
        order: doc[1],
        coupons: doc[0],
      }));
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
