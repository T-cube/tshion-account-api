import _ from 'underscore';
import express from 'express';
import Promise from 'bluebird';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import { mapObjectIdToData } from 'lib/utils';
import Plan from 'models/plan/plan';
import Payment from 'models/plan/payment';
import PlanDegrade from 'models/plan/plan-degrade';

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
  .then(info => mapObjectIdToData(info, 'payment.order', 'plan,member_count', 'degrade.order'))
  .then(info => res.json(info))
  .catch(next);
});

api.delete('/degrade', (req, res, next) => {
  new PlanDegrade().clear(req.company._id)
  .then(doc => res.json(doc))
  .catch(next);
});

api.post('/trial', (req, res, next) => {
  let { plan } = req.body;
  let planModel = new Plan(req.company._id);
  planModel.getStatus()
  .then(status => {
    // if (!_.contains(status.certified, plan)) {
    //   throw new ApiError(400, 'team_not_certified');
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
