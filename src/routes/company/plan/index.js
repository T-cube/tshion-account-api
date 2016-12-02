import _ from 'underscore';
import express from 'express';

import { ApiError } from 'lib/error';
import Plan from 'models/plan/plan';
import Auth from 'models/plan/auth';
import Product from 'models/plan/product';

let api = express.Router();

export default api;


api.get('/item', (req, res, next) => {
  Plan.list()
  .then(plan => res.json(plan))
  .catch(next);
});

api.get('/current', (req, res, next) => {
  new Auth(req.company._id).getAuthPlan()
  .then(plan => res.json(plan))
  .catch(next);
});

// api.post('/item', (req, res, next) => {
//   let { type, plan, period } = req.body;
//   let planModel = new Plan(req.company._id);
//   let company_id = req.company._id;
//   let user_id = req.user._id;
//   let date_start = new Date();
//   let auth = new Auth(company_id);
//   auth.getAuthPlan().thne(authedPlan => {
//     if (authedPlan != plan) {
//       throw new ApiError(400, 'invalid_team_plan');
//     }
//     return planModel.getCurrent().then(currentPlan => {
//       // expire current plan
//       let createPromise;
//       let data = {plan, date_start, company_id, user_id};
//       if (type == 'trail') {
//         createPromise =planModel.createNewTrial(data);
//       } else if (type == 'paid') {
//         createPromise =planModel.createNewPaid(data, period);
//       }
//       return createPromise.then(() => planModel.expireCurrent())
//       .then(() => res.json({}));
//     });
//   })
//   .catch(next);
// });


api.use('/order', require('./order').default);
api.use('/recharge', require('./recharge').default);
api.use('/auth', require('./auth').default);
