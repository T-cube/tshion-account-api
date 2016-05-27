import _ from 'underscore';
import express from 'express'
import { ObjectId } from 'mongodb';

import { ApiError } from 'lib/error';
import { oauthCheck } from 'lib/middleware';
import upload from 'lib/upload';

import { sanitizeValidateObject } from 'lib/inspector';
import {
  infoSanitization, infoValidation,
  avatarSanitization, avatarValidation,
  settingsSanitization, settingsValidation,
  optionsSanitization, optionsValidation,
} from './schema';

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
  local: 1,
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
    res.json(data);
  });
});

api.put('/info', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(infoSanitization, infoValidation, data);
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
  sanitizeValidateObject(settingsSanitization, settingsValidation, data);
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
  sanitizeValidateObject(optionsSanitization, optionsValidation, data);
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

api.put('/avatar', upload({type: 'avatar'}).single('avatar'),
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

api.get('/project', (req, res, next) =>  {
  db.user.findOne({
    _id: req.user._id
  }, {
    projects: 1
  })
  .then(userInfo => {
    if (!userInfo || !userInfo.projects.length) {
      return res.json([]);
    }
    let { company, type, search } = req.query;
    let condition = {
      _id: {$in: userInfo.projects}
    };
    if (search) {
      condition['$text'] = {
        $search: search
      }
    }
    if (company) {
      if (ObjectId.isValid(company)) {
        condition['company_id'] = ObjectId(company);
      } else {
        res.json([]);
      }
    }
    switch (type) {
      case 'archived':
        condition['is_archived'] = true;
        break;
      case 'mine':
        condition['owner'] = req.user._id;
      default:
        search || (condition['is_archived'] = false);
    }
    return db.project.find(condition)
  })
  .then(data => res.json(data))
  .catch(next)
});

api.get('/activity', (req, res, next) => {
  let { last_id } = req.query;
  req.model('activity').fetch({
    user: req.user._id,
  }, last_id)
  .then(list => res.json(list))
  .catch(next);
})

api.use('/schedule', require('./schedule').default);
