import _ from 'underscore';
import express from 'express';

import { ApiError } from 'lib/error';
import Plan from 'models/plan/plan';
import Auth from 'models/plan/auth';

let api = express.Router();

export default api;


api.get('/', (req, res, next) => {
  let auth = new Auth(req.company._id);
  Promise.all([
    auth.getAuthPlan(),
    Plan.list()
  ])
  .then(doc => res.json({
    current: doc[0],
    list: doc[1],
  }))
  .catch(next);
});

// api.get('/item', (req, res, next) => {
//   let planModel = new Plan();
//   let { page, pagesize } = req.query;
//   planModel.get(req.company._id, {page, pagesize})
//   .then(plan => {
//     res.json(plan);
//   })
//   .catch(next);
// });
//
// api.get('/item/current', (req, res, next) => {
//   let planModel = new Plan();
//   planModel.getCurrent(req.company._id)
//   .then(plan => res.json(plan))
//   .catch(next);
// });

api.post('/item', (req, res, next) => {
  let { type, plan, period } = req.body;
  let planModel = new Plan(req.company._id);
  let company_id = req.company._id;
  let user_id = req.user._id;
  let date_start = new Date();
  let auth = new Auth(company_id);
  auth.getAuthPlan().thne(authedPlan => {
    console.log('authedPlan', authedPlan);
    if (authedPlan != plan) {
      throw new ApiError(400, 'invalid_team_plan');
    }
    return planModel.getCurrent().then(currentPlan => {
      console.log(currentPlan);
      // expire current plan
      let data = {plan, date_start, company_id, user_id};
      if (type == 'trail') {
        return planModel.createNewTrial(data)
        .then(() => res.json({}));
      } else if (type == 'paid') {
        return planModel.createNewPaid(data, period)
        .then(() => res.json({}));
      }
    });
  })
  .catch(next);
});

api.put('/item/current/status', (req, res, next) => {
  // let { status } = req.body;
  res.json({});
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
