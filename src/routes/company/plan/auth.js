import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';

import db from 'lib/database';
import C from 'lib/constants';
import { upload } from 'lib/upload';
import { validate } from 'models/plan/schema';
import { ApiError } from 'lib/error';
import Auth from 'models/plan/auth';
import Realname from 'models/plan/realname';
import { saveCdn } from 'lib/upload';

let api = express.Router();
export default api;


// api.get('/', (req, res, next) => {
//   let { status, plan } = req.query;
//   let criteria = {
//     company_id: req.company._id
//   };
//   if (status && !_.isString(status)) {
//     criteria.status = status;
//   } else if (_.isArray[status])  {
//     criteria.status = {$in: status};
//   }
//   if (plan) {
//     criteria.plan = plan;
//   }
//   return db.plan.auth.find(criteria, {info: 0, log: 0})
//   .sort({
//     date_apply: -1
//   })
//   .limit(1)
//   .then(doc => res.json(doc[0] || null))
//   .catch(next);
// });

api.get('/status', (req, res, next) => {
  Auth.getAuthStatus(req.company._id)
  .then(doc => res.json(doc))
  .catch(next);
});

api.get('/history', (req, res, next) => {
  let {page, pagesize} = req.query;
  Auth.list(req.company._id, {page, pagesize})
  .then(doc => res.json(doc))
  .catch(next);
});

api.get('/realname', (req, res, next) => {
  new Realname(req.user._id).get()
  .then(doc => res.json(doc))
  .catch(next);
});

const cdnBucket = 'cdn-auth';

api.post('/pro',
handelUpload('pro'),
saveCdn(cdnBucket),
createOrUpdatePro());

api.post('/ent',
handelUpload('ent'),
saveCdn(cdnBucket),
createOrUpdateEnt());

api.put('/pro',
handelUpload('pro', true),
saveCdn(cdnBucket),
createOrUpdatePro(true));

api.put('/ent',
handelUpload('ent', true),
saveCdn(cdnBucket),
createOrUpdateEnt(true));

api.put(/\/(pro|ent)\/status\/?/, (req, res, next) => {
  let plan = req.params[0];
  let { status } = req.body;
  status = 'cancelled';
  Auth.getAuthStatus(req.company._id, plan)
  .then(info => {
    if (!info[plan] || 'accepted' == info[plan].status) {
      throw new ApiError(400, 'invalid_request');
    }
    return Auth.updateStatus(info[plan]._id, status);
  })
  .then(() => res.json({}))
  .catch(next);
});

function handelUpload(plan, isUpdate) {
  return (req, res, next) => {
    validate(`auth_${plan}`, req.body);
    let preCriteriaPromise = Auth.getAuthStatus(req.company._id, plan);
    if (isUpdate) {
      preCriteriaPromise = preCriteriaPromise.then(info => {
        if (!info[plan] || info[plan].status != 'rejected') {
          throw new ApiError(400, 'invalid_request');
        }
      });
    } else {
      preCriteriaPromise = preCriteriaPromise.then(info => {
        if (info[plan] && !_.contains(['rejected', 'cancelled'], info[plan].status)) {
          throw new ApiError(400, 'invalid_request');
        }
      });
    }
    preCriteriaPromise.then(() => {
      let uploadType = `plan-auth-${plan}`;
      upload({type: uploadType}).array('auth_pic')(req, res, next);
    })
    .catch(next);
  };
}

function createOrUpdatePro(isUpdate) {
  return (req, res, next) => {
    let info = req.body;
    let auth = new Auth(req.company._id, req.user._id);
    let pics = req.files ? req.files.map(file => _.pick(file, 'relpath', 'url')) : [];
    let realnameData = info.contact;
    let realnameModel = new Realname(req.user._id);
    let promise = realnameModel.get();
    if (realnameData) {
      realnameData.realname_ext.idcard_photo = pics;
      realnameData.status = 'posted';
      promise.then(realname => {
        if (realname) {
          throw new ApiError(400, 'user realname authed');
        }
        return realnameModel.persist(realnameData).then(() => {
          info.contact = req.user._id;
          return isUpdate ? auth.update(info) : auth.create(C.TEAMPLAN.PRO, info);
        });
      });
    } else {
      promise.then(realname => {
        if (!realname) {
          throw new ApiError(400, 'empty realname');
        }
        info.contact =  req.user._id;
        return isUpdate ? auth.update(info) : auth.create(C.TEAMPLAN.PRO, info);
      });
    }
    return promise.then(doc => res.json(doc)).catch(next);
  };
}

function createOrUpdateEnt(isUpdate) {
  return (req, res, next) => {
    let info = req.body;
    let auth = new Auth(req.company._id, req.user._id);
    let pics = req.files ? req.files.map(file => _.pick(file, 'relpath', 'url')) : [];
    info.enterprise.certificate_pic = pics;
    let promise = isUpdate ? auth.update(info) : auth.create(C.TEAMPLAN.ENT, info);
    return promise.then(doc => res.json(doc)).catch(next);
  };
}
