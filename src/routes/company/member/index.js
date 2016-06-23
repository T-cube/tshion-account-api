import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import { defaultAvatar } from 'lib/upload';
import C from 'lib/constants';
import { sanitizeValidateObject } from 'lib/inspector';
import { sanitization, validation } from './schema';
import { checkUserType, checkUserTypeFunc } from '../utils';
import { isEmail, time } from 'lib/utils';
import Structure from 'models/structure';

/* company collection */
let api = express.Router();
export default api;

api.use((req, res, next) => {
  next();
});

api.get('/', (req, res, next) => {
  const members = req.company.members;
  const memberIds = _.pluck(members, '_id');
  db.user.find({
    _id: {$in: memberIds}
  }, {
    avatar: 1,
  })
  .then(users => {
    _.each(members, m => {
      let user = _.find(users, u => u._id.equals(m._id));
      _.extend(m, user);
      m.avatar = m.avatar || defaultAvatar('user');
    });
    res.json(members);
  })
  .catch(next);
});

api.post('/', checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN), (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(sanitization, validation, data);
  data.type = C.COMPANY_MEMBER_TYPE.NORMAL;
  let member = _.find(req.company.members, m => m.email == data.email);
  if (member) {
    throw new ApiError(400, null, 'member exists');
  }
  db.user.findOne({email: data.email}, {_id: 1, name: 1})
  .then(user => {
    data.status = C.COMPANY_MEMBER_STATUS.PENDING;
    if (user) {
      // invite registered user;
      let member = _.find(req.company.members, m => {
        m._id.equals(user._id);
      });
      if (member) {
        throw new ApiError(400, null, 'member exists');
      }
      data._id = user._id;
    } else {
      // invite new user throw email;
      data._id = ObjectId();
    }
    db.request.insert({
      from: req.user._id,
      to: data._id,
      type: C.REQUEST_TYPE.COMPANY,
      object: req.company._id,
      status: C.REQUEST_STATUS.PENDING,
      date_create: time(),
    })
    .then(request => {
      req.model('notification').send({
        from: req.user._id,
        to: user._id,
        action: C.ACTIVITY_ACTION.CREATE,
        target_type: C.OBJECT_TYPE.REQUEST,
        request: request._id,
        company: req.company._id,
      });
    });
    return db.company.update({
      _id: req.company._id,
    }, {
      $push: {members: data}
    });
  })
  .then(doc => res.json(data))
  .catch(next);
});

api.post('/check', (req, res, next) => {
  let email = req.body.email;
  if (!isEmail(email)) {
    return res.json({});
  }
  let member = _.find(req.company.members, m => m.email == email);
  db.user.findOne({
    email: email
  }, {
    _id: 0,
    name: 1,
    avatar: 1,
    email: 1,
  })
  .then(doc => {
    let data = {
      is_registered: !!doc
    };
    if (doc) {
      _.extend(data, doc);
    }
    if (member) {
      data.name = member.name;
      data.is_member = true;
      data.status = member.status;
    } else {
      data.is_member = false;
    }
    res.json(data);
  })
  .catch(next);
});

api.get('/:member_id', (req, res, next) => {
  let data = req.body;
  let member_id = ObjectId(req.params.member_id);
  let members = req.company.members || [];
  let member = _.find(members, m => member_id.equals(m._id));
  if (!member) {
    next(ApiError(404));
  }
  res.json(member);
});

api.put('/:member_id', (req, res, next) => {
  let member_id = ObjectId(req.params.member_id);
  if (!req.user._id.equals(member_id)) {
    checkUserTypeFunc(req, C.COMPANY_MEMBER_TYPE.ADMIN);
  }
  let fields = _.keys(req.body);
  sanitizeValidateObject(_.pick(sanitization, fields), _.pick(validation, fields), req.body);
  let data = {};
  _.each(req.body, (val, key) => {
    data['members.$.' + key] = val;
  });
  db.company.update({
    _id: req.company._id,
    'members._id': member_id
  }, {
    $set: data
  })
  .then(() => res.json({}))
  .catch(next);
});

api.delete('/:member_id', checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN), (req, res, next) => {
  const member_id = ObjectId(req.params.member_id);
  if (member_id.equals(req.user._id)) {
    throw new ApiError(400, null, 'can not remove yourself');
  }
  return Promise.all([
    db.company.update({
      _id: req.company._id,
    }, {
      $pull: {members: {_id: member_id}}
    }),
    db.user.update({
      _id: member_id,
    }, {
      $pull: {companies: req.company._id}
    })
  ])
  .then(() => {
    let tree = new Structure(req.company.structure);
    tree.deleteMemberAll(member_id);
    req.structure = tree;
    return save(req);
  })
  .then(() => res.json({}))
  .catch(next);
});

api.post('/exit', (req, res, next) => {
  const member_id = req.user._id;
  if (req.company.owner.equals(member_id)) {
    throw new ApiError(400, null, 'company owner can not exit');
  }
  return Promise.all([
    db.company.update({
      _id: req.company._id,
    }, {
      $pull: {members: {_id: member_id}}
    }),
    db.user.update({
      _id: member_id,
    }, {
      $pull: {companies: req.company._id}
    })
  ])
  .then(() => res.json({}))
  .catch(next);
});

function addActivity(req, action, data) {
  let info = {
    action: action,
    target_type: C.OBJECT_TYPE.MEMBER,
    company: req.company._id,
    creator: req.user._id,
  };
  _.extend(info, data);
  return req.model('activity').insert(info);
}

function addNotification(req, action, data) {
  let info = {
    action: action,
    target_type: C.OBJECT_TYPE.MEMBER,
    company: req.company._id,
    from: req.user._id,
    to: _.filter(req.company.members.map(member => member._id), id => id.equals(req.user._id))
  };
  _.extend(info, data);
  return req.model('notification').send(info);
}

function save(req) {
  return db.company.update(
    {_id: req.company._id},
    {$set: {structure: req.structure.object()}}
  );
}
