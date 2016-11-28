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

api.post('/', (req, res, next) => {
  let data = req.body;
  validate('create_order', data);
  let { month_count, user_count, coupons } = data;
  let planModel = new Plan(req.company._id);
  planModel.getProduct()
  .then(products => {
    if (!products) {
      throw new ApiError(400, 'product_not_accessable');
    }
    products.monthly.count = month_count;
    products.user.count = user_count;
    let orderModel = new Order({
      company_id: req.company._id,
      user_id: req.user._id,
    });
    orderModel.addProducts(products);
    if (coupons) {
      orderModel.useCoupons(coupons);
    }
    return orderModel.save();
  })
  .thne(order_id => res.json({order_id}))
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
  let payment = new Payment().getInstance(payment_method);

});
