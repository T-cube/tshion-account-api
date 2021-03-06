import _ from 'underscore';
import express from 'express';
import {ObjectId} from 'mongodb';
import config from 'config';
import compare from 'node-version-compare';
import crypto from 'crypto';

import C from 'lib/constants';
import db from 'lib/database';
import {ApiError} from 'lib/error';
import {oauthCheck} from 'lib/middleware';
import {upload, saveCdn, cropAvatar} from 'lib/upload';
import {maskEmail, maskMobile, mapObjectIdToData} from 'lib/utils';
import UserLevel from 'models/user-level';

import {validate} from './schema';

import {updateUserInfoCache} from 'lib/cache';

const version = require('../../../package.json').version;

const BASIC_FIELDS = {
  _id: 1,
  email: 1,
  email_verified: 1,
  mobile: 1,
  mobile_verified: 1,
  avatar: 1,
  name: 1,
  description: 1,
  sex: 1,
  birthdate: 1,
  local: 1,
  address: 1,
  timezone: 1,
  // settings
  date_join: 1,
  current_company: 1,
  options: 1,
  'wechat.openid': 1
};

/* users collection */
const api = express.Router();
export default api;

api.use(oauthCheck());

api.get('/info', (req, res, next) => {
  db
    .user
    .findOne({
      _id: req.user._id
    }, BASIC_FIELDS)
    .then(data => {
      console.log(data);
      // new UserLevel(data)   .getLevelInfo()   .then(levelInfo => {
      // data.level_info = levelInfo; if (data.email) {   data.email =
      // maskEmail(data.email); } if (data.mobile) {   data.mobile =
      // maskMobile(data.mobile); }
      res.sendJson(data);
      // });
    })
    .catch(next);
});

api.put('/info', (req, res, next) => {
  let data = req.body;
  validate('info', data);
  db
    .user
    .update({
      _id: req.user._id
    }, {$set: data})
    .then(result => {
      return updateUserInfoCache({_id: req.user._id, data}).then(() => {
        res.sendJson(result);
      });
    })
    .catch(next);
});

api.put('/settings', (req, res, next) => {
  let data = req.body;
  validate('settings', data);
  if (!_.keys(data).length) {
    throw new ApiError(400, null, 'no setting provided!');
  }
  db
    .user
    .update({
      _id: req.user._id
    }, {$set: data})
    .then(() => res.sendJson(data))
    .catch(next);
});

let avatarFunc = (req, res, next) => {
  const data = {
    avatar: cropAvatar(req)
  };
  db
    .user
    .update({
      _id: req.user._id
    }, {$set: data})
    .then(() => {
      return updateUserInfoCache({_id: req.user._id, data}).then(() => {
        res.sendJson(data);
      });
    })
    .catch(next);
};

api.post('/avatar', avatarFunc);

api.put('/avatar', avatarFunc);

let uploadFunc = (req, res, next) => {
  if (!req.file) {
    throw new ApiError(400, 'file_type_error');
  }
  const data = {
    avatar: cropAvatar(req)
  };
  db
    .user
    .update({
      _id: req.user._id
    }, {$set: data})
    .then(() => {
      return updateUserInfoCache({_id: req.user._id, data}).then(() => {
        res.sendJson(data);
      });
    })
    .catch(next);
};

api.post('/avatar/upload', upload({type: 'avatar'}).single('file'), saveCdn('cdn-public'), uploadFunc);

api.put('/avatar/upload', upload({type: 'avatar'}).single('avatar'), saveCdn('cdn-public'), uploadFunc);

api.get('/guide', (req, res, next) => {
  db
    .user
    .guide
    .findOne({_id: req.user._id})
    .then(user_guide => {
      let new_user,
        guide;
      if (!guide) {
        new_user = 1;
        guide = 1;
      } else {
        new_user = 0;
        guide = compare(version, user_guide.version);
      }
      return res.sendJson({version, new_user, guide});
    })
    .catch(next);
});

api.put('/guide', (req, res, next) => {
  db
    .user
    .guide
    .update({
      _id: req.user._id
    }, {
      $set: {
        version
      }
    }, {upsert: true})
    .then(() => res.sendJson(200))
    .catch(next);
});

api.get('/guide/new', (req, res, next) => {
  db
    .guide
    .get({version: 0})
    .then(doc => res.sendJson(doc))
    .catch(next);
});

api.get('/guide/version/:version', (req, res, next) => {
  db
    .guide
    .get({version: req.params.version})
    .then(doc => res.sendJson(doc))
    .catch(next);
});

api.post('/guide', (req, res, next) => {
  let data = req.body;
  db
    .guide
    .insert(data)
    .then(() => res.sendJson(200))
    .catch(next);
});

api.get('/invite', (req, res, next) => {
  let redis = req.model('redis');
  let timetemp = new Date().getTime();
  db
    .user
    .findOne({_id: req.user._id})
    .then(doc => {
      let user_id = req
        .user
        ._id
        .toString();
      let company_id = doc
        .current_company
        .toString();

    })
    .catch(next);
});

api.post('/invitation', (req, res, next) => {
  let company_id = ObjectId(req.body.company_id);
  db
    .company
    .findOne({_id: company_id})
    .then(doc => {
      if (!doc) {
        res.sendJson(...req.body);
      }
      if (_.some(doc.members, m => m._id.equals(req.user._id) && m.status == 'normal')) {
        res.sendJson({_id: doc._id, name: doc.name});
      } else if (_.some(doc.members, m => m._id.equals(req.user._id))) {
        return Promise.all([
          db
            .user
            .update({
              _id: req.user._id
            }, {
              $addToSet: {
                companies: company_id
              }
            }),
          db
            .company
            .update({
              _id: doc._id,
              'members._id': req.user._id
            }, {
              $set: {
                'members.$.status': C.COMPANY_MEMBER_STATUS.NORMAL
              },
              $addToSet: {
                'structure.members': {
                  _id: req.user._id
                }
              }
            }),
          req
            .model('activity')
            .insert({creator: req.user._id, company: company_id, action: C.ACTIVITY_ACTION.JOIN, target_type: C.OBJECT_TYPE.COMPANY})
        ]).then(() => {
          res.sendJson({_id: doc._id, name: doc.name});
        });
      } else {
        return Promise.all([
          db
            .user
            .update({
              _id: req.user._id
            }, {
              $addToSet: {
                companies: company_id
              }
            }),
          db
            .company
            .update({
              _id: company_id
            }, {
              $addToSet: {
                members: {
                  _id: req.user._id,
                  name: req.user.name,
                  email: req.user.email,
                  mobile: req.user.mobile,
                  sex: null,
                  status: C.COMPANY_MEMBER_STATUS.NORMAL,
                  type: C.COMPANY_MEMBER_TYPE.NORMAL,
                  address: ''
                },
                'structure.members': {
                  _id: req.user._id
                }
              }
            }),
          req
            .model('activity')
            .insert({creator: req.user._id, company: company_id, action: C.ACTIVITY_ACTION.JOIN, target_type: C.OBJECT_TYPE.COMPANY})
        ]).then(() => {
          res.sendJson({_id: doc._id, name: doc.name});
        });
      }
    })
    .catch(next);
});
