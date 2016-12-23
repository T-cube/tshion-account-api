import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import config from 'config';

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
  let company_id = req.company._id;
  new Auth(company_id).getAuthStatus()
  .then(doc => res.json(doc))
  .catch(next);
});

api.get('/history', (req, res, next) => {
  let company_id = req.company._id;
  let { page, pagesize } = req.query;
  page = (page && parseInt(page)) || 1;
  pagesize = (pagesize <= config.get('view.maxListNum') && pagesize > 0) ? parseInt(pagesize) : config.get('view.listNum');
  let criteria = company_id ? {company_id} : {};
  return Promise.all([
    db.plan.auth.count(criteria),
    db.plan.auth.find(criteria, {
      log: 0,
      'data.info.contact': 0,
    })
    .limit(pagesize)
    .skip(pagesize * (page - 1)),
  ])
  .then(([totalrows, list]) => {
    res.json({
      page,
      pagesize,
      totalrows,
      list,
    });
  })
  .catch(next);
});

api.get('/item/:authId', (req, res, next) => {
  let company_id = req.company._id;
  db.plan.auth.findOne({
    company_id,
    _id: ObjectId(req.params.authId)
  })
  .then(doc => {
    doc.info = doc.data.pop();
    res.json(doc);
  })
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
  validate('cancel', req.body);
  let { plan, status } = req.body;
  let company_id = req.company._id;
  let authModel = new Auth(company_id);
  return authModel.cancel(plan)
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
    let company_id = req.company._id;
    let authModel = new Auth(company_id);
    if (isUpdate) {
      authModel.checkUpdate(plan).then(next).catch(next);
    } else {
      authModel.checkCreate(plan).then(next).catch(next);
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
          throw new ApiError(400, 'user realname certified');
        }
        let postPicIds = realnameData.realname_ext.idcard_photo;
        return req.model('auth-pic')
        .pop({plan: C.TEAMPLAN.PRO, user_id, files: postPicIds})
        .then(pics => {
          realnameData.realname_ext.idcard_photo = _.pluck(pics, 'url');
          realnameData.status = 'posted';
          return realnameModel.persist(realnameData).then(() => {
            info.contact = user_id;
            return isUpdate ? auth.update(info) : auth.create(C.TEAMPLAN.PRO, {info, user_id});
          });
        });
      });
    } else {
      promise = promise.then(realname => {
        if (!realname) {
          throw new ApiError(400, 'empty realname');
        }
        info.contact = user_id;
        return isUpdate ? auth.update(info) : auth.create(C.TEAMPLAN.PRO, {info, user_id});
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
    let user_id = req.user._id;
    req.model('auth-pic')
    .pop({plan: C.TEAMPLAN.ENT, company_id, files: info.enterprise.certificate_pic})
    .then(pics => {
      info.enterprise.certificate_pic = _.pluck(pics, 'url');
      let auth = new Auth(company_id);
      let promise = isUpdate ? auth.update(info) : auth.create(C.TEAMPLAN.ENT, {info, user_id});
      return promise.then(doc => res.json(doc)).catch(next);
    });
  };
}
