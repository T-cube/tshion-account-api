import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';

import db from 'lib/database';
import C, {ENUMS} from 'lib/constants';
import { upload } from 'lib/upload';
import { validate } from './schema';
import { ApiError } from 'lib/error';
import Auth from 'models/plan/auth';
import Realname from 'models/plan/realname';
import { saveCdn } from 'lib/upload';
import { indexObjectId } from 'lib/utils';

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

api.post('/', checkValid(), (req, res, next) => {
  let {plan} = req.query;
  if (plan == C.TEAMPLAN.PRO) {
    createOrUpdatePro()(req, res, next);
  } else if (plan == C.TEAMPLAN.ENT) {
    createOrUpdateEnt()(req, res, next);
  }
});

api.put('/', checkValid(true), (req, res, next) => {
  let {plan} = req.query;
  if (plan == C.TEAMPLAN.PRO) {
    createOrUpdatePro(true)(req, res, next);
  } else if (plan == C.TEAMPLAN.ENT) {
    createOrUpdateEnt(true)(req, res, next);
  }
});

api.put('/status', (req, res, next) => {
  let { plan, status } = req.body;
  if (status != 'cancelled') {
    throw new ApiError(400, 'invalid_status');
  }
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

api.post('/upload', (req, res, next) => {
  let { plan } = req.query;
  if (!_.contains(ENUMS.TEAMPLAN_PAID, plan)) {
    throw new ApiError(400, 'invalid_team_plan');
  }
  let uploadType = `plan-auth-${plan}`;
  upload({type: uploadType}).array('auth_pic')(req, res, next);
}, saveCdn('cdn-private'), (req, res, next) => {
  let { plan } = req.query;
  let files = req.files;
  if (!files || !files.length) {
    return res.json([]);
  }
  files = files.map(file => _.pick(file, 'mimetype', 'url', 'filename', 'path', 'size', 'cdn_bucket', 'cdn_key'));
  let user_id = req.user._id;
  let company_id = req.company._id;
  req.model('auth-pic')
  .save({plan, company_id, user_id, files})
  .then(doc => res.json(doc))
  .catch(next);
});

function checkValid(isUpdate) {
  return (req, res, next) => {
    let { plan } = req.query;
    if (!_.contains(ENUMS.TEAMPLAN_PAID, plan)) {
      throw new ApiError(400, 'invalid_team_plan');
    }
    let preCriteriaPromise = Auth.getAuthStatus(req.company._id, plan);
    if (isUpdate) {
      preCriteriaPromise.then(info => {
        if (!info[plan] || info[plan].status != 'rejected') {
          return next(new ApiError(400, 'auth_cannot_update'));
        }
        next();
      });
    } else {
      preCriteriaPromise.then(info => {
        if (info[plan] && !_.contains(['rejected', 'cancelled'], info[plan].status)) {
          return next(new ApiError(400, 'auth_posted'));
        }
        next();
      });
    }
  };
}

function createOrUpdatePro(isUpdate) {
  return (req, res, next) => {
    let info = req.body;
    let user_id = req.user._id;
    validate('auth_pro', info);
    let auth = new Auth(req.company._id, req.user._id);
    let realnameData = info.contact;
    let realnameModel = new Realname(req.user._id);
    let promise = realnameModel.get();
    if (realnameData) {
      promise = promise.then(realname => {
        if (realname) {
          throw new ApiError(400, 'user realname authed');
        }
        let postPicIds = realnameData.realname_ext.idcard_photo;
        return req.model('auth-pic').pop({plan: C.TEAMPLAN.PRO, user_id, files: postPicIds})
        .then(pics => {
          realnameData.realname_ext.idcard_photo = pics;
          realnameData.status = 'posted';
          return realnameModel.persist(realnameData).then(() => {
            info.contact = user_id;
            return isUpdate ? auth.update(info) : auth.create(C.TEAMPLAN.PRO, info);
          });
        });
      });
    } else {
      promise = promise.then(realname => {
        if (!realname) {
          throw new ApiError(400, 'empty realname');
        }
        info.contact = user_id;
        return isUpdate ? auth.update(info) : auth.create(C.TEAMPLAN.PRO, info);
      });
    }
    promise.then(doc => res.json(doc)).catch(next);
  };
}

function createOrUpdateEnt(isUpdate) {
  return (req, res, next) => {
    let info = req.body;
    validate('auth_ent', info);
    let company_id = req.company._id;
    req.model('auth-pic')
    .pop({plan: C.TEAMPLAN.PRO, company_id, files: info.enterprise.certificate_pic})
    .then(pics => {
      info.enterprise.certificate_pic = pics;
      let auth = new Auth(company_id, req.user._id);
      let promise = isUpdate ? auth.update(info) : auth.create(C.TEAMPLAN.ENT, info);
      return promise.then(doc => res.json(doc)).catch(next);
    });
  };
}
