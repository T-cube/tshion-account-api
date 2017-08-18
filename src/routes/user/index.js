import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import config from 'config';
import compare from 'node-version-compare';
import crypto from 'crypto';

import C from 'lib/constants';
import db from 'lib/database';
import { ApiError } from 'lib/error';
import { oauthCheck } from 'lib/middleware';
import { upload, saveCdn, cropAvatar } from 'lib/upload';
import { maskEmail, maskMobile, mapObjectIdToData } from 'lib/utils';
import UserLevel from 'models/user-level';
import Realname from 'models/plan/realname';

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
const api = express.Router();
export default api;

api.use(oauthCheck());

api.get('/info', (req, res, next) => {
  db.user.findOne({
    _id: req.user._id
  }, BASIC_FIELDS)
  .then(data => {
    return Promise.all([
      new UserLevel(data).getLevelInfo(),
      req.model('preference').get(req.user._id)
    ])
    .then(([levelInfo, preference]) => {
      data.level_info = levelInfo;
      data.preference = preference;
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

api.get('/recent/projects', (req, res, next) => {
  db.user.findOne({_id: req.user._id}, {'recent.projects': 1}).then(doc => {
    if (!doc.recent || !doc.recent.projects || !doc.recent.projects.length) {
      return db.user.findOne({_id: req.user._id}, {projects: 1}).then(doc => {
        mapObjectIdToData(doc.projects.slice(-4), 'project').then(projects => {
          res.json(projects);
        });
      });
    }
    let projects = _.sortBy(doc.recent.projects, item => -item.date).slice(0, 4).map(project => project.project_id);
    mapObjectIdToData(projects, 'project').then(() => {
      res.json(projects);
    });
  }).catch(next);
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
  const data = {
    avatar: cropAvatar(req),
  };
  db.user.update({
    _id: req.user._id
  }, {
    $set: data,
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
  const data = {
    avatar: cropAvatar(req),
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
        condition.is_archived = true;
        break;
      case 'mine':
        condition.owner = req.user._id;
        break;
    }
    if (!search && !condition.is_archived) {
      condition.is_archived = false;
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

api.post('/preference', (req, res, next) => {
  let data = req.body;
  validate('preference', data);
  if (_.isEmpty(data)) {
    throw new ApiError(400, 'invalid_preference_data');
  }
  req.model('preference').set(req.user._id, data)
  .then(() => res.json({}))
  .catch(next);
});

api.post('/preference/reset', (req, res, next) => {
  let data = req.body;
  validate('preference_reset', data);
  req.model('preference').reset(req.user._id, data.type)
  .then(() => res.json({}))
  .catch(next);
});

api.get('/realname', (req, res, next) => {
  new Realname(req.user._id).get()
  .then(doc => {
    if (!doc) {
      return res.json(null);
    }
    const qiniu = req.model('qiniu').bucket('cdn-private');
    return Promise.all(doc.realname_ext.idcard_photo.map(file => {
      return qiniu.makeLink(file);
    }))
    .then(pics => {
      doc.realname_ext.idcard_photo = pics;
      return res.json(doc);
    });
  })
  .catch(next);
});

api.post('/invitation', (req, res, next) => {
  let t = req.body.t;
  let c = req.body.c;
  let check = crypto.createHash('md5').update(''+t+c).digest('hex');
  if (check == req.body.h) {
    let now = new Date().getTime();
    if (now - parseInt(t) > 1800000) {
      res.redirect(301, config.get('webUrl'));
    }
    let company_id = ObjectId(c);
    let url = config.get('webUrl') + `/oa/company/${c}/home`;
    db.company.findOne({
      _id: ObjectId(c)
    })
    .then(doc => {
      if (_.some(doc.members, m => m._id.equals(req.user._id))) {
        res.json({_id: doc._id, name: doc.name});
      } else {
        return Promise.all([
          db.user.update({
            _id: req.user._id
          }, {
            $addToSet:{
              companies: company_id
            }
          }),
          db.company.update({
            _id: company_id,
          }, {
            $push: {
              members: {
                _id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                mobile: req.user.mobile,
                sex: null,
                status: C.COMPANY_MEMBER_STATUS.NORMAL,
                type: C.COMPANY_MEMBER_TYPE.NORMAL,
                address: ''
              }
            }
          }),
          req.model('activity').insert({
            creator: req.user._id,
            company: company_id,
            action: C.ACTIVITY_ACTION.JOIN,
            target_type: C.OBJECT_TYPE.COMPANY,
          })
        ])
        .then(() => {
          res.json({_id: doc._id, name: doc.name});
        });
      }
    });
  } else {
    throw new ApiError(400, 'invitation_url_expire');
  }
});

api.use('/schedule', require('./schedule').default);
