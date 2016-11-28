import express from 'express';

import { validate } from 'models/plan/schema';
import { ApiError } from 'lib/error';
import Auth from 'models/plan/auth';
import Plan from 'models/plan/plan';



let api = express.Router();
export default api;


api.post('/', (req, res, next) => {
  let auth = new Auth(req.company._id, req.user._id);
  let data = req.body;
  return auth.getActiveAuth().then(info => {
    if (info) {
      let { plan, status } = info;
      if (status == 'posted' || status == 'reposted') {
        throw new ApiError(400, 'cannot_create_new_auth');
      }
      if (data.plan == 'free' || plan == 'ent' || (plan == 'pro' && data.plan != 'ent')) {
        throw new ApiError(400, 'cannot_create_auth');
      }
    }
    let validateType = data.plan == 'pro' ? 'auth_pro' : 'auth_ent';
    validate(validateType, data);
    return auth.create(data);
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.put('/', (req, res, next) => {
  let auth = new Auth(req.company._id);
  let data = req.body;
  auth.getRejectedAuth().then(info => {
    if (!info || data.plan != info.plan) {
      throw new ApiError(400, 'invalid_request');
    }
    return auth.update(info._id, data);
  })
  .catch(next);
});

api.put('/status', (req, res, next) => {
  // let status = 'cancelled';
  let auth = new Auth(req.company._id);
  auth.cancel()
  .catch(next);
});
