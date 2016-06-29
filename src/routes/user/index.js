import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';

import C from 'lib/constants';
import db from 'lib/database';
import { ApiError } from 'lib/error';
import { oauthCheck } from 'lib/middleware';
import upload from 'lib/upload';
import { comparePassword, hashPassword, maskEmail, maskMobile } from 'lib/utils';

import { validate } from './schema';
import { validate as validateAccount } from '../account/schema';

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
    if (data.email) {
      data.email = maskEmail(data.email);
    }
    if (data.mobile) {
      data.mobile = maskMobile(data.mobile);
    }
    res.json(data);
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

api.put('/options', (req, res, next) => {
  let data = req.body;
  validate('options', data);
  if (!_.keys(data).length) {
    throw new ApiError(400, null, 'no option provided!');
  }
  let fields = {};
  _.each(data, (val, key) => {
    fields[`options.${key}`] = val;
  });
  db.user.update({
    _id: req.user._id
  }, {
    $set: fields,
  })
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

api.put('/avatar/upload', upload({type: 'avatar'}).single('avatar'),
(req, res, next) => {
  if (!req.file) {
    throw new ApiError(400, null, 'file type not allowed');
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

api.post('/change-pass', (req, res, next) => {
  let data = req.body;
  console.log(data);
  let { old_password, new_password } = data;
  console.log(old_password, new_password);
  db.user.findOne({
    _id: req.user._id,
  }, {
    password: 1,
  })
  .then(user => {
    console.log(old_password, user.password);
    console.log('found user');
    return comparePassword(old_password, user.password);
  })
  .then(result => {
    console.log('compare password', result);
    if (!result) {
      throw new ApiError(401, 'bad_password', 'password is not correct');
    }
    return hashPassword(new_password);
  })
  .then(password => {
    console.log('hash password', password);
    return Promise.all([
      db.user.update({
        _id: req.user._id,
      }, {
        $set: {
          password: password,
        }
      }),
      // TODO logout current user
    ]);
  })
  .then(() => res.json({}))
  .catch(next);
});

api.post('/account/verify', (req, res, next) => {
  let data = req.body;
  let type = data.type;
  validateAccount('register', data, ['type', type]);
  if (data[type] != req.user[type]) {
    throw new ApiError(400, 'verify_fail');
  }
  res.json({});
});

api.post('/account/send-code', (req, res, next) => {
  let data = req.body;
  let type = data.type;
  let oldIdKey = 'old_' + type;
  let newIdKey = 'new_' + type;
  let schemaKeys = ['type', 'code', `${newIdKey} as ${type}`];
  let binded = req.user[type] != null;
  if (!binded) {
    schemaKeys.push(`${oldIdKey} as ${type}`);
  }
  validateAccount('register', data, schemaKeys);
  if (binded && data[oldIdKey] != req.user[type]) {
    throw new ApiError(400, 'verify_fail');
  }
  req.model('account').sendCode(type, data[newIdKey])
  .then(() => res.json({}))
  .catch(next);
});

api.post('/account/bind-account', (req, res, next) => {
  let data = req.body;
  let type = data.type;
  let oldIdKey = 'old_' + type;
  let newIdKey = 'new_' + type;
  let schemaKeys = ['type', 'code', `${newIdKey} as ${type}`];
  let binded = req.user[type] != null;
  if (!binded) {
    schemaKeys.push(`${oldIdKey} as ${type}`);
  }
  validateAccount('register', data, schemaKeys);
  if (binded && data[oldIdKey] != req.user[type]) {
    throw new ApiError(400, 'verify_fail');
  }
  req.model('account').verifyCode(type, data[newIdKey], data.code)
  .then(() => {
    return db.user.update({
      _id: req.user._id,
    }, {
      $set: {
        [type]: data[newIdKey],
        [type + '_verified']: true,
      }
    });
  })
  .then(() => res.json({}))
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

api.use('/schedule', require('./schedule').default);
