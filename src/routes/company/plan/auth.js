import express from 'express';

import { ApiError } from 'lib/error';
import Auth from 'models/plan/auth';
import Plan from 'models/plan/plan';


let api = express.Router();
export default api;


api.post('/', (req, res, next) => {
  let auth = new Auth(req.company._id);
  let data = req.body;
  let planModel = new Plan(req.company._id);
  return planModel.getCurrent().then(currentPlan => {
    if (!currentPlan || currentPlan.plan != data.plan) {
      throw new ApiError(400, 'invalid_team_plan');
    }
    return auth.getActiveAuthPlan().then(info => {
      let { plan, status } = info;
      if (status == 'posted' || status == 'reposted') {
        throw new ApiError(400, 'cannot_create_new_auth');
      }
      if (data.plan == 'free' || plan == 'ent' || (plan == 'pro' && data.plan != 'ent')) {
        throw new ApiError(400, 'cannot_create_auth');
      }
      return auth.create(data);
    })
    .catch(next);
  });
});

api.put('/', (req, res, next) => {
  let auth = new Auth(req.company._id);
  let data = req.body;
  auth.getActiveAuthPlan().then(info => {
    let { plan, status } = info;
    if (status != 'rejected') {
      throw new ApiError(400);
    }
    return auth.create(data);
  })
  .catch(next);
});

api.put('/status', (req, res, next) => {
  // let status = 'cancelled';
  let auth = new Auth(req.company._id);
  auth.cancel()
  .catch(next);
});
