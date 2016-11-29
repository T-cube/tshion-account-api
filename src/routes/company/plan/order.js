import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';

import { ApiError } from 'lib/error';
import { validate } from './schema';
import Order from 'models/plan/order';
import Plan from 'models/plan/plan';
import Payment from 'models/plan/payment';

let api = express.Router();

export default api;


api.get('/', (req, res, next) => {

});

api.post(/\/(prepare)?$/, (req, res, next) => {
  let isPrepare = /prepare$/.test(req.url);
  let data = req.body;
  validate('create_order', data);
  let { coupon } = data;
  let productsQuantity = data.products;
  let planModel = new Plan(req.company._id);
  planModel.getProduct()
  .then(products => {
    if (!products) {
      throw new ApiError(400, 'product_not_accessable');
    }
    products.forEach(product => {
      let quantityInfo = _.find(productsQuantity, item => item.product_no == product.product_no);
      product.quantity = quantityInfo ? quantityInfo.quantity : 0;
    });
    // products.filter(product => product.quantity);
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

api.get('/:orderId', (req, res, next) => {

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
