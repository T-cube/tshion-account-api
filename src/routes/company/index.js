import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import fs from 'fs';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import C from 'lib/constants';
import { upload, saveCdn, randomAvatar, defaultAvatar, cropAvatar } from 'lib/upload';
import { oauthCheck, authCheck } from 'lib/middleware';
import { time } from 'lib/utils';
import { sanitizeValidateObject } from 'lib/inspector';
import { companySanitization, companyValidation } from './schema';
import Structure from 'models/structure';
import CompanyLevel from 'models/company-level';
import UserLevel from 'models/user-level';
import { COMPANY_MEMBER_UPDATE } from 'models/notification-setting';

import {
  MODULE_PROJECT,
  MODULE_TASK,
  MODULE_DOCUMENT,
  MODULE_APPROVAL,
  MODULE_ANNOUNCEMENT,
  MODULE_ATTENDANCE,
  MODULE_STRUCTURE,
} from 'models/plan/auth-config';

/* company collection */
let api = express.Router();
export default api;

api.use(oauthCheck());

// Get company list
api.get('/', (req, res, next) => {
  db.user.findOne({
    _id: req.user._id
  }, {
    companies: 1
  })
  .then(user => {
    let companies = user.companies || [];
    return db.company.find({
      _id: { $in: companies }
    }, {
      name: 1,
      description: 1,
      logo: 1,
    });
  })
  .then(list => res.json(list))
  .catch(next);
});

// Add new company
api.post('/', (req, res, next) => {
  let data = req.body; // contains name, description only
  sanitizeValidateObject(companySanitization, companyValidation, data);

  let userLevel = new UserLevel(req.user);
  userLevel.canOwnCompany().then(canOwnCompany => {
    if (false == canOwnCompany) {
      throw new ApiError(400, 'over_company_num');
    }
    return db.user.findOne({
      _id: req.user._id
    }, {
      name: 1, email: 1, mobile: 1, birthdate: 1, sex: 1,
    });
  })
  .then(member => {
    // compose default data structure
    let position_id = ObjectId();
    _.extend(member, {
      joindate: time(),
      status: C.COMPANY_MEMBER_STATUS.NORMAL,
      type: C.COMPANY_MEMBER_TYPE.OWNER,
    });
    _.extend(data, {
      owner: member._id,
      members: [member],
      logo: randomAvatar('company', 10),
      structure: {
        _id: ObjectId(),
        name: data.name,
        positions: [{
          _id: position_id,
          title: __('administrator'),
        }],
        members: [{
          _id: member._id,
          position: position_id,
        }],
        children: [],
      },
      projects: [],
      date_create: time(),
    });
    return db.company.insert(data);
  })
  .then(company => {
    req.model('activity').insert({
      creator: req.user._id,
      action: C.ACTIVITY_ACTION.CREATE,
      target_type: C.OBJECT_TYPE.COMPANY,
      company: company._id
    });
    // init company level
    CompanyLevel.init(company._id);
    // add company to user
    return db.user.update({
      _id: req.user._id
    }, {
      $push: { companies: company._id }
    })
    .then(() => res.json(company));
  })
  .catch(next);
});

api.param('company_id', (req, res, next, id) => {
  let company_id = ObjectId(id);
  db.company.findOne({
    _id: company_id,
    'members._id': req.user._id,
  })
  .then(company => {
    if (!company) {
      throw new ApiError(404);
    }
    req.company = company;
    req.companyLevel = new CompanyLevel(company_id);
    next();
  })
  .catch(next);
});

// Get company detail
api.get('/:company_id', (req, res, next) => {
  const members = req.company.members;
  const memberIds = _.pluck(members, '_id');
  Promise.all([
    req.companyLevel.getPlanInfo(true),
    db.user.find({
      _id: {$in: memberIds},
    }, {
      avatar: 1,
    })
  ])
  .then(([planInfo, users]) => {
    _.each(members, m => {
      let user = _.find(users, u => u._id.equals(m._id));
      _.extend(m, user);
      m.avatar = m.avatar || defaultAvatar('user');
    });
    req.company.plan = planInfo;
    req.company.modules = req.companyLevel.getModules(planInfo.plan);
    res.json(req.company);
  })
  .catch(next);
});

api.put('/:company_id', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(companySanitization, companyValidation, data);

  db.company.update(
    {_id: ObjectId(req.params.company_id)},
    {$set: data}
  )
  .then(doc => {
    res.json(doc);
    let update_fields = [];
    if (data.name != req.company.name) {
      update_fields.push(['name', req.company.name, data['name']]);
    }
    if (data.description != req.company.description) {
      update_fields.push(['description']);
    }
    req.model('activity').insert({
      creator: req.user._id,
      action: C.ACTIVITY_ACTION.UPDATE,
      target_type: C.OBJECT_TYPE.COMPANY,
      company: req.company._id,
      update_fields,
    });
  })
  .catch(next);
});

api.delete('/:company_id', authCheck(), (req, res, next) => {
  const company = req.company;
  const companyId = company._id;
  if (!req.user._id.equals(company.owner)) {
    throw new ApiError(403);
  }
  let query = {
    company_id: companyId,
  };
  let projectQuery = {
    project_id: {$in: req.company.projects},
  };
  let combinedQuery = {$or: [{
    company: companyId,
  }, {
    project: {$in: req.company.projects},
  }]};
  // TODO do deletion in service
  let members = req.company.members;
  let memberIds = _.pluck(members, '_id');
  Promise.all([
    db.activity.remove(combinedQuery),
    db.announcement.remove(query),
    db.approval.user.find({'map.company_id': companyId}, {'map.$': 1})
    .then(list => {
      let listIds = _.pluck(list, 'id');
      let flowIds = _.map(list, item => item.map[0].flow_id);
      return Promise.all([
        db.approval.user.remove({id: {$in: listIds}}),
        db.approval.flow.remove({id: {$in: flowIds}}),
      ]);
    }),
    db.approval.item.remove(query),
    db.approval.template.remove(query),
    db.approval.template.master.remove(query),
    db.attendance.setting.remove({_id: companyId}),
    db.attendance.sign.remove({company: companyId}),
    db.company.remove({_id: companyId}),
    db.company.level.remove({_id: companyId}),
    db.discussion.find(projectQuery)
    .then(list => {
      let listIds = _.pluck(list, 'id');
      return Promise.all([
        db.discussion.remove(projectQuery),
        db.discussion.comment.remove({discussion_id: {$in: listIds}}),
      ]);
    }),
    db.document.dir.remove(query),
    db.document.file.find({$or: [query, projectQuery]}, {path: 1})
    .then(list => {
      let promises = [];
      _.each(list, file => {
        promises.push(db.document.files.remove({_id: file._id}));
        fs.unlink(file.path, e => {
          if (e) {
            console.error('delete file failed: ' + file.path);
          }
        });
      });
      return Promise.all(promises);
    }),
    db.notification.remove(combinedQuery),
    db.project.remove(query),
    db.request.remove({type: 'company', object: companyId}),
    db.task.find(query, {comments: 1})
    .then(list => {
      let commentIds = [];
      _.each(list, item => {
        commentIds = commentIds.concat(item.comments);
      });
      return Promise.all([
        db.task.remove(query),
        db.task.comments.remove({_id: {$in: commentIds}}),
      ]);
    }),
    // remove current_company for user
    db.user.update({current_company: companyId}, {$set: {current_company: null}}, {multi: true}),
    // remove company from user
    db.user.update({_id: {$in: memberIds}}, {$pull: {companies: companyId}}, {multi: true}),
  ])
  .then(() => res.json({}))
  .catch(next);
});

api.put('/:company_id/logo', (req, res, next) => {
  const data = {
    logo: cropAvatar(req),
  };
  db.company.update({
    _id: req.company._id
  }, {
    $set: data
  })
  .then(() => res.json(data))
  .catch(next);
});

api.put('/:company_id/logo/upload',
upload({type: 'avatar'}).single('logo'),
saveCdn('cdn-public'),
(req, res, next) => {
  if (!req.file) {
    throw new ApiError(400, 'file_type_error');
  }
  const data = {
    logo: cropAvatar(req),
  };
  db.company.update({
    _id: req.company._id
  }, {
    $set: data,
  })
  .then(() => res.json(data))
  .catch(next);
});

api.post('/:company_id/transfer', authCheck(), (req, res, next) => {
  let user_id = ObjectId(req.body.user_id);
  let company = req.company;
  if (req.user._id.equals(user_id)) {
    throw new ApiError(400, 'can_not_transfer_to_yourself');
  }
  if (!req.user._id.equals(company.owner)) {
    throw new ApiError(403, null, 'only owner can carry out this operation');
  }
  let member = _.find(company.members, m => m._id.equals(user_id));
  if (!member) {
    throw new ApiError(404, 'member_not_exists');
  }
  db.user.findOne({_id: user_id})
  .then(user => {
    if (!user) {
      throw new ApiError(404, 'user_not_exists');
    }
    return new UserLevel(user).canOwnCompany();
  })
  .then(canOwnCompany => {
    if (false == canOwnCompany) {
      throw new ApiError(400, 'over_company_num');
    }
    return Promise.all([
      db.company.update({
        _id: company._id,
        'members._id': user_id,
      }, {
        $set: {
          owner: user_id,
          'members.$.type': C.COMPANY_MEMBER_TYPE.OWNER,
        }
      }),
      db.company.update({
        _id: company._id,
        'members._id': req.user._id,
      }, {
        $set: {
          'members.$.type': C.COMPANY_MEMBER_TYPE.ADMIN,
        }
      })
    ]);
  })
  .then(() => {
    res.json({});
    req.model('activity').insert({
      creator: req.user._id,
      company: company._id,
      action: C.ACTIVITY_ACTION.TRANSFER,
      target_type: C.OBJECT_TYPE.COMPANY,
      user: user_id,
    });
  })
  .catch(next);
});

api.post('/:company_id/exit', (req, res, next) => {
  const company_id = req.company._id;
  const projects = req.company.projects;
  const user_id = req.user._id;
  if (user_id.equals(req.company.owner)) {
    throw new ApiError(400, 'owner_can_not_exit');
  }
  const tree = new Structure(req.company.structure);
  tree.deleteMemberAll(user_id);
  Promise.all([
    db.user.update({
      _id: user_id,
    }, {
      $pull: { companies: company_id },
    }),
    db.user.update({
      _id: user_id,
    }, {
      $pull: { projects: {$in: projects} },
    }),
    db.company.update({
      _id: company_id,
    }, {
      $pull: { members: {_id: user_id} },
      $set: { structure: tree.object() },
    }),
    db.project.update({
      _id: {$in: projects},
    }, {
      $pull: { members: {_id: user_id} },
    }, {
      multi: true,
    }),
  ])
  .then(() => {
    res.json({});
    let info = {
      company: company_id,
      action: C.ACTIVITY_ACTION.EXIT,
      target_type: C.OBJECT_TYPE.COMPANY
    };
    req.model('activity').insert(_.extend({}, info, {
      creator: user_id,
    }));
    let to = req.company.members.filter(member => _.contains(['admin', 'owner'], member.type)).map(member => member._id);
    req.model('notification').send(_.extend({}, info, {
      from: user_id,
      to
    }), COMPANY_MEMBER_UPDATE)
    .catch(e => console.error(e));
  })
  .catch(next);
});

let ckeckAuth = (_module) => (req, res, next) => {
  req.companyLevel.getPlanInfo()
  .then(planInfo => {
    let modules = req.companyLevel.getModules(planInfo.plan);
    if (_module && !_.contains(modules, _module)) {
      // throw new ApiError(400, 'module_permission_deny'); // TODO
    }
    return req.companyLevel.getPlanInfo();
  })
  .then(planInfo => {
    if (planInfo.status == C.PLAN_STATUS.EXPIRED && req.method != 'GET') {
      throw new ApiError(400, 'plan_expired');
    }
    next();
  })
  .catch(next);
};

api.use('/:company_id/project', ckeckAuth(MODULE_PROJECT), require('./project').default);
api.use('/:company_id/task', ckeckAuth(MODULE_TASK), require('../task').default);
api.use('/:company_id/document', ckeckAuth(MODULE_DOCUMENT), require('./document').default);
api.use('/:company_id/approval', ckeckAuth(MODULE_APPROVAL), require('./approval').default);
api.use('/:company_id/announcement', ckeckAuth(MODULE_ANNOUNCEMENT), require('./announcement').default);
api.use('/:company_id/attendance', ckeckAuth(MODULE_ATTENDANCE), require('./attendance').default);
api.use('/:company_id/structure', ckeckAuth(MODULE_STRUCTURE), require('./structure').default);
api.use('/:company_id/activity', require('./activity').default);
api.use('/:company_id/member', require('./member').default);
api.use('/:company_id/plan', require('./plan').default);
