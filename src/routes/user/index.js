import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import config from 'config';
import compare from 'node-version-compare';

import C from 'lib/constants';
import db from 'lib/database';
import { ApiError } from 'lib/error';
import { oauthCheck } from 'lib/middleware';
import { upload, saveCdn } from 'lib/upload';
import { comparePassword, hashPassword, maskEmail, maskMobile } from 'lib/utils';
import UserLevel from 'models/user-level';

import { validate } from './schema';

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
  'wechat.openid': 1,
};

/* users collection */
let api = express.Router();
export default api;

api.use(oauthCheck());

api.get('/info', (req, res, next) => {
  db.user.findOne({
    _id: req.user._id
  }, BASIC_FIELDS)
  .then(data => {
    return new UserLevel(data).getLevelInfo()
    .then(levelInfo => {
      data.level_info = levelInfo;
      if (data.email) {
        data.email = maskEmail(data.email);
      }
      if (data.mobile) {
        data.mobile = maskMobile(data.mobile);
      }
      res.json(data);
    });
  })
  .catch(next);
});

api.put('/info', (req, res, next) => {
  let data = req.body;
  validate('info', data);
  db.user.update({
    _id: req.user._id
  }, {
    $set: data
  })
  .then(result => res.json(result))
  .catch(next);
});

api.put('/settings', (req, res, next) => {
  let data = req.body;
  validate('settings', data);
  if (!_.keys(data).length) {
    throw new ApiError(400, null, 'no setting provided!');
  }
  db.user.update({
    _id: req.user._id
  }, {
    $set: data,
  })
  .then(() => res.json(data))
  .catch(next);
});

api.get('/options/notification', (req, res, next) => {
  req.model('notification-setting').getAll(req.user._id)
  .then(data => {
    let parsed = {};
    _.each(data, (item, type) => {
      parsed[type] = {};
      _.each(item, (v, method) => {
        if (v.editable) {
          parsed[type][method] = v.on;
        } else {
          parsed[type][method] = v.on ? 1 : 0;
        }
      });
    });
    res.json(parsed);
  })
  .catch(next);
});

api.put('/options/notification', (req, res, next) => {
  let data = req.body;
  validate('options-notification', data);
  let { type, method, on } = data;
  req.model('notification-setting').set(req.user._id, type, method, on)
  .then(() => res.json(data))
  .catch(next);
});

api.put('/avatar', (req, res, next) => {
  let { avatar } = req.body;
  let data = {
    avatar: avatar
  };
  db.user.update({
    _id: req.user._id
  }, {
    $set: data
  })
  .then(() => res.json(data))
  .catch(next);
});

api.put('/avatar/upload',
upload({type: 'avatar'}).single('avatar'),
saveCdn('cdn-public'),
(req, res, next) => {
  if (!req.file) {
    throw new ApiError(400, 'file_type_error');
  }
  let data = {
    avatar: req.file.url
  };
  db.user.update({
    _id: req.user._id
  }, {
    $set: data
  })
  .then(() => res.json(data))
  .catch(next);
});

api.get('/project', (req, res, next) =>  {
  db.user.findOne({
    _id: req.user._id
  }, {
    projects: 1
  })
  .then(userInfo => {
    if (!userInfo || !userInfo.projects || !userInfo.projects.length) {
      return res.json([]);
    }
    let { company, type, search } = req.query;
    let condition = {
      _id: {$in: userInfo.projects}
    };
    if (search) {
      condition['$text'] = {
        $search: search
      };
    }
    if (company) {
      if (ObjectId.isValid(company)) {
        condition['company_id'] = ObjectId(company);
      } else {
        return res.json([]);
      }
    }
    switch (type) {
    case 'archived':
      condition['is_archived'] = true;
      break;
    case 'mine':
      condition['owner'] = req.user._id;
      break;
    }
    if (!search && !condition['is_archived']) {
      condition['is_archived'] = false;
    }
    return db.project.find(condition)
    .then(data => res.json(data));
  })
  .catch(next);
});

api.get('/activity', (req, res, next) => {
  let { last_id } = req.query;
  db.user.findOne({
    _id: req.user._id
  }, {
    companies: 1
  })
  .then(userInfo => {
    let condition = null;
    if (!userInfo.companies || !userInfo.companies.length) {
      condition = {
        creator: req.user._id,
      };
    } else {
      condition = {
        $or: [{
          company: {
            $in: userInfo.companies
          }
        }, {
          creator: req.user._id,
        }]
      };
    }
    return req.model('activity').fetch(condition, last_id);
  })
  .then(list => res.json(list))
  .catch(next);
});

api.get('/guide', (req, res, next) => {
  db.user.guide.findOne({
    _id: req.user._id
  })
  .then(user_guide => {
    let new_user, guide;
    if (!guide) {
      new_user = 1;
      guide = 1;
    } else {
      new_user = 0;
      guide = compare(version, user_guide.version);
    }
    return res.json({
      version,
      new_user,
      guide,
    });
  })
  .catch(next);
});

api.put('/guide', (req, res, next) => {
  db.user.guide.update({
    _id: req.user._id,
  }, {
    $set: {version}
  }, {
    upsert: true
  })
  .then(() => res.json({}))
  .catch(next);
});

api.get('/guide/new', (req, res, next) => {
  db.guide.get({
    version: 0
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.get('/guide/version/:version', (req, res, next) => {
  db.guide.get({
    version: req.params.version
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.post('/guide', (req, res, next) => {
  let data = req.body;
  db.guide.insert(data)
  .then(() => res.json({}))
  .catch(next);
});

api.use('/schedule', require('./schedule').default);
