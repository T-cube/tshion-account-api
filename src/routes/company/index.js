import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';
import db from 'lib/database';
import { ApiError } from 'lib/error';
import C, { ENUMS } from 'lib/constants';
import { upload, saveCdn, randomAvatar, defaultAvatar, cropAvatar } from 'lib/upload';
import { oauthCheck, authCheck } from 'lib/middleware';
import { time, mapObjectIdToData, strToReg, fetchCompanyMemberInfo } from 'lib/utils';
import { validate } from './schema';
import Structure from 'models/structure';
import CompanyLevel from 'models/company-level';
import UserLevel from 'models/user-level';
import { COMPANY_MEMBER_UPDATE } from 'models/notification-setting';
import Plan from 'models/plan/plan';
import { attachFileUrls } from 'routes/company/document/index';
import {
  MODULE_PROJECT,
  MODULE_TASK,
  MODULE_DOCUMENT,
  MODULE_APPROVAL,
  MODULE_ANNOUNCEMENT,
  MODULE_ATTENDANCE,
  MODULE_STRUCTURE,
} from 'models/plan/auth-config';
import config from 'config';
import Approval from 'models/approval';

/* company collection */
const api = express.Router();
export default api;
api.use(oauthCheck());
// Get company list

api.get('/test', (req, res, next) => {
  res.json({});
});
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
  validate('company', data);
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
      logo: randomAvatar('company'),
      structure: {
        _id: ObjectId(),
        name: data.name,
        admin: req.user._id,
        positions: [],
        members: [{
          _id: member._id,
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
    // create root dir include application dirs such as report, notebook , activity and so on
    createRootDir(company._id, req.user._id, req.company);
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
    next();
  })
  .catch(next);
});


api.post('/:company_id/upload',
upload({type: 'attachment'}).single('document'),
saveCdn('cdn-file'),
(req, res, next) => {
  validate('upload', req.body);
  let file = req.file;
  if (!file) {
    throw new ApiError(400, 'file_not_upload');
  }
  let user_id = req.user._id;
  let company_id = req.company._id;
  let fileData = _.pick(file, 'mimetype', 'url', 'path', 'relpath', 'size', 'cdn_bucket', 'cdn_key');
  _.extend(fileData, {
    name: file.originalname,
    company: company_id,
    module: {
      name: req.body.name,
    },
    author: user_id,
    date_update: new Date(),
    date_create: new Date(),
    updated_by: user_id,
  });
  return db.user.file.insert(fileData).then(doc => {
    return doc;
  }).catch(next);
});

// Get company detail
api.get('/:company_id', (req, res, next) => {
  const members = req.company.members;
  const memberIds = _.pluck(members, '_id');
  let companyLevel = new CompanyLevel(req.company._id);
  Promise.all([
    companyLevel.getPlanInfo(true),
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
    req.company.modules = companyLevel.getModulesByPlan(planInfo.plan);
    res.json(req.company);
  })
  .catch(next);
});
api.put('/:company_id', (req, res, next) => {
  let data = req.body;
  validate('company', data);
  db.plan.auth.findOne({
    company_id: req.company._id
  })
  .then(doc => {
    if (doc && doc.status == C.AUTH_STATUS.ACCEPTED ) {
      throw new ApiError(400, 'certified_company_can_not_change_company_name');
    }
    return db.company.update(
      {_id: ObjectId(req.params.company_id)},
      {$set: data}
    )
    .then(company => {
      res.json(company);
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
  db.plan.company.findOne({_id: ObjectId(companyId)}).then(doc => {
    if (doc) {
      if (doc.current && doc.current.type !== 'trail') {
        throw new ApiError(400, 'ent & pro company cannot delete');
      }
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
        let listIds = _.pluck(list, '_id');
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
        let listIds = _.pluck(list, '_id');
        return Promise.all([
          db.discussion.remove(projectQuery),
          db.discussion.comment.remove({discussion_id: {$in: listIds}}),
        ]);
      }),
      db.document.dir.remove(query),
      db.document.file.find({$or: [query, projectQuery]})
      .then(list => {
        let promises = [];
        _.each(list, file => {
          req.model('document').deleteFile(req, file);
          promises.push(db.document.file.remove({_id: file._id}));
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
    .then(() => res.json({}));
  }).catch(next);
});

api.put('/:company_id/remind/plan', (req, res, next) => {
  validate('remind', req.body);
  if (!req.user._id.equals(req.company.owner)) {
    throw new ApiError(400, 'no_owner_can_not_change');
  }
  let companyLevel = new CompanyLevel(req.company._id);
  companyLevel.getPlanInfo(true)
  .then(planInfo => {
    if (planInfo.status == 'actived') {
      res.json({});
    } else {
      let { close_plan_expired_remind, close_before_expired_remind } = req.body;
      let data;
      req.body.hasOwnProperty('close_before_expired_remind') ? (data = { 'current.close_before_expired_remind': close_before_expired_remind }) : null;
      req.body.hasOwnProperty('close_plan_expired_remind') ? (data = { 'current.close_plan_expired_remind': close_plan_expired_remind }) : null;
      return db.plan.company.update({
        _id: req.company._id
      }, {
        $set: data
      })
      .then(() => {
        res.json({});
      });
    }
  })
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
    throw new ApiError(400, 'cannot_transfer_to_yourself');
  }
  if (!req.user._id.equals(company.owner)) {
    throw new ApiError(403, null, 'not_company_owner');
  }
  let member = _.find(company.members, m => m._id.equals(user_id));
  if (!member) {
    throw new ApiError(404, 'member_not_exists');
  }
  new Plan(company._id).getPlanInfo().then((plan) => {
    if (plan) {
      const { certified } = plan;
      if (certified) {
        throw new ApiError(400, 'certified_company_cannot_transfer');
      }
    }
    return db.user.findOne({_id: user_id});
  })
  .then(user => {
    if (!user) {
      throw new ApiError(404, 'user_not_exists');
    }
    return new UserLevel(user).canOwnCompany();
  })
  .then(canOwnCompany => {
    if (false == canOwnCompany) {
      throw new ApiError(400, 'over_own_company_num');
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
api.get('/:company_id/recent/project', (req, res, next) => {
  Promise.all([
    db.user.findOne({_id: req.user._id}),
    db.company.findOne({_id: req.company._id}),
  ])
  .then(([user, company]) => {
    if (!user.recent || !user.recent.projects || !user.recent.projects.length) {
      let company_recent = _.intersection(company.projects, user.projects);
      return mapObjectIdToData(company_recent.slice(-4), 'project').then(() => {
        res.json(company_recent);
      });
    }
    let company_recent = _.pluck(_.sortBy(user.recent.projects, item => -item.date), 'project_id').slice(0, 4);
    return mapObjectIdToData(company_recent, 'project').then(() => {
      res.json(company_recent);
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
  return db.project.findOne({
    company_id: req.company._id,
    owner: req.user._id,
    is_archived: false
  })
  .then(doc => {
    if (doc) {
      throw new ApiError(400, 'this_member_still_hava_own_project');
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
      db.approval.template.find({
        company_id: req.company._id,
        status: C.APPROVAL_STATUS.NORMAL,
        'steps.approver._id': req.user._id,
      }, {
        _id: 1
      })
      .then(list => {
        return Promise.map(list, item => {
          return Approval.cancelItemsUseTemplate(req, item._id);
        });
      })
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
    });
  })
  .catch(next);
});
api.get('/:company_id/user/file', (req, res, next) => {
  validate('user_file', req.query);
  let last_id = req.query.last_id;
  let key_word = req.query.key_word;
  let sort_type = req.query.sort_type;
  let criteria = {
    author: req.user._id,
    company: req.company._id,
  };
  if (key_word) {
    criteria['$or'] = [
      {
        mimetype: {
          $regex: strToReg(key_word, 'i')
        },
      },
      {
        name: {
          $regex: strToReg(key_word, 'i')
        },
      },
    ];
  }
  if (last_id) {
    db.user.file
    .find(criteria, {_id: 1})
    .sort({[sort_type]: -1})
    .then(list => {
      let id_index = _getIdIndex(last_id, list);
      let target_list = list.slice(id_index, id_index + 10);
      return Promise.all(target_list.map(item => {
        return db.user.file
        .findOne({_id: item._id})
        .then(doc => {
          return attachFileUrls(req, doc).then(() => {
            return doc;
          });
        });
      }))
      .then(data => {
        res.json(data);
      });
    });
  } else {
    db.user.file.find(criteria).sort({[sort_type]: -1}).limit(10).then(list => {
      return Promise.all(list.map(item => {
        return attachFileUrls(req, item).then(() => {
          return item;
        });
      })).then(() => {
        res.json(list);
      });
    })
    .catch(next);
  }
});
api.get('/:company_id/invite', (req, res, next) => {
  // if (!_.some(req.company.members, item => item._id.equals(req.user._id)&&(item.type=='admin'||item.type=='owner'))) {
  //   throw new ApiError(400, 'only_owner_and_admin_can_get_invite_url');
  // }
  let timetemp = new Date().getTime();
  let user_id = req.user._id.toString();
  let company_id = req.company._id.toString();
  let content = user_id + ',' + company_id;
  // res.json({t,c,h});
  let key = (Math.random() + timetemp).toString(36);
  let deepkey = 'c' + (Math.random() + timetemp).toString(36);
  let url  = config.get('apiUrl') + 's/' + key;
  let redis = req.model('redis');
  redis.set(key, deepkey).then(status => {
    redis.expire(key, 3600);
    redis.set(deepkey, content).then(() => {
      redis.expire(deepkey, 3600);
      res.json({url: url});
    });
  });
});

api.post('/:company_id/root/dir', (req, res, next) => {
  let root_id = ObjectId(req.body.root_id);
  db.document.dir.findOne({
    parent_dir: root_id,
    attachment_dir: true,
    attachment_root_dir: true
  })
  .then(doc => {
    if (doc) {
      res.json(doc);
    } else {
      createAppDir(req.company._id, req.user._id, root_id, req.company)
      .then(doc => {
        res.json(doc);
      });
    }
  })
  .catch(next);
});

function _getIdIndex(last_id, list) {
  let id_index;
  for (let i = 0; i < list.length; i++) {
    if (list[i]._id.equals(last_id)) {
      id_index = i + 1;
      break;
    }
    if (i == list.length - 1) {
      if (!id_index) {
        throw new ApiError(400, 'invalid_last_id');
      }
    }
  }
  return id_index;
}
let ckeckAuth = (_module) => (req, res, next) => {
  let companyLevel = new CompanyLevel(req.company._id);
  companyLevel.getPlanInfo()
  .then(planInfo => {
    let modules = companyLevel.getModulesByPlan(planInfo.plan);
    if (planInfo.status == C.PLAN_STATUS.EXPIRED && req.method != 'GET') {
      throw new ApiError(400, 'plan_expired');
    }
    if (_module && !_.contains(modules, _module)) {
      // throw new ApiError(400, 'module_permission_deny'); // TODO
    }
    next();
  })
  .catch(next);
};

function createRootDir (company_id, user_id, company) {
  db.document.dir.insert({
    company_id,
    parent_dir: null,
    name: '',
    dirs: [],
    files: []
  })
  .then(root => {
    createAppDir(company_id, user_id, root._id, company);
  });
}

function createAppDir(company_id, user_id, root_id, company) {
  let date = new Date();
  let app_dir = {
    name: '应用附件',
    parent_dir: root_id,
    files: [],
    dirs: [],
    company_id,
    updated_by: user_id,
    date_update: date,
    date_create: date,
    path: [root_id],
    attachment_dir: true,
    attachment_root_dir: true
  };
  return db.document.dir.insert(app_dir)
  .then(app => {
    let base = {
      parent_dir: app._id,
      files: [],
      dirs: [],
      company_id,
      updated_by: user_id,
      date_create: date,
      date_update: date,
      path: [root_id, app._id],
      attachment_dir: true
    };
    return Promise.all([
      db.document.dir.insert(_.extend({}, base, {name: '活动', for: 'com.tlifang.activity'})),
      db.document.dir.insert(_.extend({}, base, {name: '工作汇报', for: 'com.tlifang.report'})),
    ])
    .then(([activity, report]) => {
      return Promise.all([
        db.document.dir.update({
          _id: root_id
        }, {
          $push: {
            dirs: app._id
          }
        }),
        db.document.dir.update({
          _id: app._id
        }, {
          $set: {
            dirs: [activity._id, report._id]
          }
        }),
      ]);
    })
    .then(() => {
      return db.document.dir.findOne({
        _id: app._id
      }, {
        updated_by: 1,
        name: 1,
        date_update: 1,
        attachment_dir: 1,
        attachment_root_dir: 1,
        dirs: 1,
      })
      .then(result => {
        result.children_dir = result.dirs;
        delete result.dirs;
        return mapObjectIdToData(result.children_dir, 'document.dir', 'attachment_dir,for,name')
        .then(() => {
          return fetchCompanyMemberInfo(company, result, 'updated_by', 'children_dir.updated_by');
        });
      });
    });
  });

}

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
api.use('/:company_id/app-center', require('./app-center').default);
api.use('/:company_id/app', require('./app').default);
