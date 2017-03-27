import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';

import config from 'config';
import db from 'lib/database';
import { ApiError } from 'lib/error';
import { defaultAvatar } from 'lib/upload';
import C from 'lib/constants';
import { sanitizeValidateObject } from 'lib/inspector';
import { sanitization, validation } from './schema';
import { checkUserType, checkUserTypeFunc } from '../utils';
import { maskEmail, maskMobile, isEmail, isMobile, time } from 'lib/utils';
import Structure from 'models/structure';
import CompanyLevel from 'models/company-level';
import {
  COMPANY_MEMBER_INVITE,
  COMPANY_MEMBER_REMOVE,
  COMPANY_MEMBER_UPDATE,
  COMPANY_MEMBER_UPDATE_SETADMIN,
  COMPANY_MEMBER_UPDATE_REMOVEADMIN,
} from 'models/notification-setting';

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

api.get('/level-info', (req, res, next) => {
  let companyLevel = new CompanyLevel(req.company._id);
  companyLevel.getStatus().then(status => {
    let {levelInfo, planInfo, setting} = status;
    let info = {
      max_members: setting.default_member + (planInfo.member_count || 0),
      member_num: levelInfo.member.count,
    };
    return res.json(info);
  })
  .catch(next);
});

api.post('/', checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN), (req, res, next) => {
  let companyLevel = new CompanyLevel(req.company._id);
  companyLevel.canAddMember().then(isCanAddMember => {
    if (!isCanAddMember) {
      throw new ApiError(400, 'over_member_num');
    }
  })
  .then(() => {
    let data = req.body;
    const { id } = data;
    let type;
    if (isEmail(id)) {
      type = 'email';
    } else if (isMobile(id)) {
      type = 'mobile';
    } else {
      throw new ApiError(400, 'invalid_account');
    }
    data[type] = id;
    delete data.id;
    sanitizeValidateObject(sanitization, validation, data);
    data.type = C.COMPANY_MEMBER_TYPE.NORMAL;
    let member = _.find(req.company.members, m => m.email == data.email);
    if (member) {
      throw new ApiError(400, 'member_exists');
    }
    return db.user.findOne({
      [type]: id,
    }, {
      _id: 1,
      name: 1,
    })
    .then(user => {
      data.status = C.COMPANY_MEMBER_STATUS.PENDING;
      if (user) {
        // invite registered user;
        let member = _.find(req.company.members, m => {
          m._id.equals(user._id);
        });
        if (member) {
          throw new ApiError(400, 'member_exists');
        }
        data._id = user._id;
      } else {
        throw new ApiError(400, 'user_not_registered');
        // TODO invite new user throw email;
        // data._id = ObjectId();
      }
      return Promise.all([
        db.request.insert({
          from: req.user._id,
          to: data._id,
          type: C.REQUEST_TYPE.COMPANY,
          object: req.company._id,
          status: C.REQUEST_STATUS.PENDING,
          date_create: time(),
        })
        .then(request => {
          return req.model('notification').send({
            from: req.user._id,
            to: data._id,
            action: C.ACTIVITY_ACTION.CREATE,
            target_type: C.OBJECT_TYPE.REQUEST,
            request: request._id,
            company: req.company._id,
          }, COMPANY_MEMBER_INVITE);
        }),
        db.company.update({
          _id: req.company._id,
        }, {
          $push: {members: data}
        }),
        CompanyLevel.incMemberCount(req.company._id, 1),
      ]);
    })
    .then(() => res.json(data));
  })
  .catch(next);
});

api.post('/check', (req, res, next) => {
  const { id } = req.body;
  let type;
  if (isEmail(id)) {
    type = 'email';
  } else if (isMobile(id)) {
    type = 'mobile';
  } else {
    throw new ApiError(400, 'invalid_account');
  }
  db.user.findOne({
    [type]: id,
  }, {
    _id: 0,
    name: 1,
    avatar: 1,
    email: 1,
    mobile: 1,
  })
  .then(doc => {
    let data = {
      is_registered: !!doc,
      type,
    };
    let member;
    if (doc) {
      _.extend(data, {
        email: maskEmail(doc.email),
        mobile: maskMobile(doc.mobile),
        avatar: doc.avatar,
        name: doc.name,
      });
      member = _.find(req.company.members, m => m._id.equals(doc._id));
    }
    data.is_member = !!member;
    if (member) {
      data.name = member.name;
      data.status = member.status;
    }
    console.log(typeof !!member);
    res.json(data);
  })
  .catch(next);
});

api.get('/:member_id', (req, res, next) => {
  let member_id = ObjectId(req.params.member_id);
  let members = req.company.members || [];
  let member = _.find(members, m => member_id.equals(m._id));
  if (!member) {
    throw new ApiError(404);
  }
  db.user.findOne({
    _id: member._id
  }, {
    avatar: 1,
  })
  .then(user => {
    if (!user) {
      member.avatar = config.get('apiUrl') + 'cdn/system/avatar/user/00.png';
      // throw new ApiError(404);
    } else {
      member.avatar = user.avatar;
    }
    res.json(member);
  })
  .catch(next);
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
  .then(() => {
    res.json({});
    if (req.body.type) {
      let activityAction;
      if (req.body.type == C.COMPANY_MEMBER_TYPE.ADMIN) {
        activityAction = C.ACTIVITY_ACTION.SET_ADMIN;
      } else {
        activityAction = C.ACTIVITY_ACTION.REMOVE_ADMIN;
      }
      let notification = {
        target_type: C.OBJECT_TYPE.COMPANY,
        company: req.company._id,
        action: activityAction,
      };
      req.model('activity').insert(_.extend({}, notification, {
        creator: req.user._id,
        user: member_id,
      }));
      req.model('notification').send(_.extend({}, notification, {
        from: req.user._id,
        to: member_id,
      }), activityAction == C.ACTIVITY_ACTION.SET_ADMIN ? COMPANY_MEMBER_UPDATE_SETADMIN : COMPANY_MEMBER_UPDATE_REMOVEADMIN);
    }
  })
  .catch(next);
});

api.delete('/:member_id', checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN), (req, res, next) => {
  const member_id = ObjectId(req.params.member_id);
  if (member_id.equals(req.user._id)) {
    throw new ApiError(400, 'can_not_remove_yourself');
  }
  let tree = new Structure(req.company.structure);
  let thisMember = _.find(req.company.members, m => m._id.equals(member_id));
  thisMember && delete thisMember._id;
  tree.deleteMemberAll(member_id);
  req.structure = tree;
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
    }),
    thisMember && db.company.member.old.update({
      user: member_id,
      company: req.company._id,
    }, {
      $set: thisMember
    }, {
      upsert: true
    }),
    db.project.update({
      company_id: req.company._id,
      'members._id': member_id,
    }, {
      $pull: {
        members: {
          _id: member_id
        }
      }
    }),
    db.request.update({
      object: req.company._id,
      to: member_id,
    }, {
      $set: {
        status: C.REQUEST_STATUS.EXPIRED,
      }
    }, {
      multi: true
    }),
    CompanyLevel.incMemberCount(req.company._id, -1),
    save(req),
  ])
  .then(() => {
    res.json({});
    addActivity(req, C.ACTIVITY_ACTION.REMOVE, {
      company_member: {
        _id: member_id,
        name: thisMember.name
      }
    });
    req.model('notification').send({
      from: req.user._id,
      to: member_id,
      action: C.ACTIVITY_ACTION.REMOVE,
      target_type: C.OBJECT_TYPE.COMPANY_MEMBER,
      company: req.company._id,
    }, COMPANY_MEMBER_REMOVE);
  })
  .catch(next);
});

api.post('/exit', (req, res, next) => {
  const member_id = req.user._id;
  if (req.company.owner.equals(member_id)) {
    throw new ApiError(400, 'owner_can_not_exit');
  }
  let thisMember = _.find(req.company.members, m => m._id.equals(member_id));
  thisMember && delete thisMember._id;
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
    }),
    thisMember && db.company.member.old.update({
      user: member_id,
      company: req.company._id,
    }, {
      $set: thisMember
    }, {
      upsert: true
    }),
    CompanyLevel.incMemberCount(req.company._id, -1),
  ])
  .then(() => {
    res.json({});
    addActivity(req, C.ACTIVITY_ACTION.EXIT, {
      company_member: {
        _id: req.user._id,
        name: thisMember.name
      }
    });
  })
  .catch(next);
});

function addActivity(req, action, data) {
  let info = {
    action: action,
    target_type: C.OBJECT_TYPE.COMPANY_MEMBER,
    company: req.company._id,
    creator: req.user._id,
  };
  _.extend(info, data);
  return req.model('activity').insert(info);
}

function save(req) {
  return db.company.update(
    {_id: req.company._id},
    {$set: {structure: req.structure.object()}}
  );
}
