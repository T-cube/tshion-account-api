import _ from 'underscore';
import express from 'express';
import Promise from 'bluebird';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import Plan from 'models/plan/plan';
import Payment from 'models/plan/payment';

let api = express.Router();

export default api;


api.get('/list', (req, res, next) => {
  return Promise.all([
    db.plan.find(),
    db.payment.product.find()
  ])
  .then(([plans, products]) => {
    plans.forEach(plan => {
      plan.products = _.filter(products, product => product.plan == plan.type);
    });
    res.json(plans);
  })
  .catch(next);
});

api.get('/status', (req, res, next) => {
  new Plan(req.company._id).getStatus()
  .then(info => res.json(info))
  .catch(next);
});

api.post('/trial', (req, res, next) => {
  let { plan } = req.body;
  let planModel = new Plan(req.company._id);
  planModel.getStatus()
  .then(status => {
    // if (!_.contains(status.authed, plan)) {
    //   throw new ApiError(400, 'team_not_authed');
    // }
    if (!_.contains(status.viable.trial, plan)) {
      throw new ApiError(400, 'trial_exists');
    }
    return planModel.createNewTrial({
      plan,
      user_id: req.user._id
    });
  })
  .then(() => res.json({}))
  .catch(next);
});

api.get('/payment', (req, res, next) => {
  let methods = new Payment().getMethods();
  res.json(methods);
});


api.use('/order', require('./order').default);
api.use('/recharge', require('./recharge').default);
api.use('/auth', require('./auth').default);
