import _ from 'underscore';
import express from 'express';

import db from 'lib/database';
import { upload } from 'lib/upload';
import { validate } from 'models/plan/schema';
import { ApiError } from 'lib/error';
import Auth from 'models/plan/auth';
import Plan from 'models/plan/plan';
import Realname from 'models/plan/realname';


let api = express.Router();
export default api;


api.get('/', (req, res, next) => {
  let { status, plan } = req.query;
  let criteria = {
    company_id: req.company._id
  };
  if (status && !_.isString(status)) {
    criteria.status = status;
  } else if (_.isArray[status])  {
    criteria.status = {$in: status};
  }
  if (plan) {
    criteria.plan = plan;
  }
  return db.plan.auth.find(criteria, {info: 0, log: 0})
  .sort({
    date_apply: -1
  })
  .limit(1)
  .then(doc => res.json(doc[0] || null))
  .catch(next);
});

api.post('/',
handelUpload(),
createOrUpdateAuth());

api.put('/',
handelUpload(true),
createOrUpdateAuth(true));

api.put('/status', (req, res, next) => {
  let { status } = req.dody;
  if (status != 'canceled' || status != 'expired') {
    throw new ApiError(400, 'invalid_status');
  }
  let auth = new Auth(req.company._id);
  auth.updateStatus(status)
  .then(() => res.json({}))
  .catch(next);
});

function handelUpload(isUpdate) {
  return (req, res, next) => {
    let { plan } = req.body;
    plan = 'pro';
    if (plan != 'pro' && plan != 'ent') {
      return next(new ApiError(400, 'invalid_plan'));
    }
    let auth = new Auth(req.company._id, req.user._id);
    let data = req.body;
    let preCriteriaPromise;
    if (isUpdate) {
      preCriteriaPromise = auth.getRejectedAuth().then(info => {
        if (!info || data.plan != info.plan) {
          throw new ApiError(400, 'invalid_request');
        }
      });
    } else {
      preCriteriaPromise = auth.getActiveAuth().then(info => {
        if (info) {
          let { plan, status } = info;
          if (status == 'posted' || status == 'reposted') {
            throw new ApiError(400, 'cannot_create_new_auth');
          }
          if (plan == 'ent' || (plan == 'pro' && data.plan != 'ent')) {
            throw new ApiError(400, 'cannot_create_auth');
          }
        }
      });
    }
    preCriteriaPromise.then(() => {
      let uploadType = plan == 'ent' ? 'plan_auth_ent' : 'plan_auth_idcard';
      upload({type: uploadType}).array('auth_pic')(req, res, next);
    })
    .catch(next);
  };
}

function createOrUpdateAuth(isUpdate) {
  return (req, res, next) => {
    let auth = new Auth(req.company._id, req.user._id);
    let pics = req.files ? req.files.map(file => file.relpath) : [];
    let data = req.body;
    let validateType;
    let promise;
    if (data.plan == 'pro') {
      let realnameModel = new Realname(req.user._id);
      validateType = 'auth_pro';
      validate(validateType, data);
      let realnameData = data.info.contact;
      if (realnameData) {
        realnameData.realname_ext.idcard_photo = pics;
        realnameData.status = 'posted';
        promise = realnameModel.getAuthed().then(doc => {
          if (doc) {
            throw new ApiError(400, 'user realname authed');
          }
          return realnameModel.create(realnameData).then(user_id => {
            data.info.contact = user_id;
            return isUpdate ? auth.update(data) : auth.create(data);
          });
        });
      } else {
        promise = realnameModel.getAuthed().then(doc => {
          if (!doc) {
            throw new ApiError(400, 'user realname not authed');
          }
          realnameData._id = req.user._id;
          data.info.contact = doc._id;
          return isUpdate ? auth.update(data) : auth.create(data);
        });
      }
    } else {
      data.info.enterprise.certificate_pic = pics;
      validateType = 'auth_ent';
      validate(validateType, data);
      promise = isUpdate ? auth.update(data) : auth.create(data);
    }
    return promise.then(doc => res.json(doc)).catch(next);
  };
}
