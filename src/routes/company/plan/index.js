import _ from 'underscore';
import express from 'express';

import Plan from 'models/plan/plan';

let api = express.Router();

export default api;

api.get('/item', (req, res, next) => {
  let planModel = new Plan();
  let { page, pagesize } = req.query;
  planModel.get(req.company._id, {page, pagesize})
  .then(plan => {
    res.json(plan);
  })
  .catch(next);
});

api.get('/item/current', (req, res, next) => {
  let planModel = new Plan();
  planModel.getCurrent(req.company._id)
  .then(plan => res.json(plan))
  .catch(next);
});

api.post('/item', (req, res, next) => {
  let { type, plan, period } = req.body;
  let planModel = new Plan(req.company._id);
  let company_id = req.company._id;
  let user_id = req.user._id;
  let date_start = new Date();
  let data = {plan, date_start, company_id, user_id};
  if (type == 'trail') {
    return planModel.createTrial(data)
    .then(() => res.json({}))
    .catch(next);
  } else if (type == 'paid') {
    return planModel.createPaid(data, period)
    .then(orderId => res.json({orderId}))
    .catch(next);
  }
  // res.json({
  //   order
  // });
});

api.put('/item/current/status', (req, res, next) => {
  let { status } = req.body;

});

api.get('/product', (req, res, next) => {
  let planModel = new Plan(req.company._id);
  planModel.getProduct()
  .then(products => res.json(products))
  .catch(next);
});


api.use('/order', require('./order').default);
api.use('/recharge', require('./recharge').default);
api.use('/auth', require('./auth').default);
