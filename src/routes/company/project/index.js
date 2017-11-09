import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';
import fs from 'fs';

import db from 'lib/database';
import { upload, saveCdn, randomAvatar, cropAvatar } from 'lib/upload';
import { ApiError } from 'lib/error';
import C from 'lib/constants';
import { authCheck } from 'lib/middleware';
import { getUniqName } from 'lib/utils';
import { time, fetchCompanyMemberInfo, findObjectIdIndex, mapObjectIdToData, fetchUserInfo } from 'lib/utils';
import {
  PROJECT_TRANSFER,
  PROJECT_QUIT,
  PROJECT_MEMBER_ADD,
  PROJECT_MEMBER_REMOVE,
  PROJECT_MEMBER_SETADMIN,
  PROJECT_MEMBER_REMOVEADMIN,
} from 'models/notification-setting';
import { validate } from './schema';
import CompanyLevel from 'models/company-level';


/* company collection */
const api = express.Router();
export default api;

api.get('/', (req, res, next) => {
  let query = {
    company_id: req.company._id,
  };
  db.project.find(query, {
    owner: 1,
    name: 1,
    description: 1,
    logo: 1,
    is_archived: 1,
  })
  .then(list => {
    return mapObjectIdToData(list, 'user', 'name,avatar', 'owner');
  })
  .then(list => res.json(list))
  .catch(next);
});

api.get('/group', (req, res, next) => {
  db.project.group.findOne({
    user_id: req.user._id,
    company_id: req.company._id,
  })
  .then(doc => {
    if (!doc) {
      return db.project.group.insert({
        company_id: req.company._id,
        user_id: req.user._id,
        groups:[]
      })
      .then(group => {
        res.json(group);
      });
    } else {
      res.json(doc);
    }
  })
  .catch(next);
});

api.post('/group', (req, res, next) => {
  validate('group', req.body, ['projects', 'type']);
  let projects = req.body.projects;
  db.project.group.findOne({
    user_id: req.user._id,
    company_id: req.company._id,
  })
  .then(doc => {
    let promise;
    let names = _.pluck(_.filter(doc.groups, (group) => group.type == req.body.type), 'name');
    let name = '新分组';
    name = getUniqName(names, name);
    if (doc && doc.groups) {
      let groups = doc.groups;
      promise = _checkExistProjectsReturnChange(req, groups, projects);
    } else {
      promise = Promise.resolve();
    }
    return promise.then(() => db.project.group.findOneAndUpdate({
      user_id: req.user._id,
      company_id: req.company._id,
    }, {
      $push: {
        groups: {
          _id: ObjectId(),
          name: name,
          projects: req.body.projects,
          type: req.body.type,
        }
      }
    }, {
      upsert: true,
      returnOriginal: false,
      returnNewDocument: true
    })
    .then(doc => {
      let result = doc.value;
      let pull_groups = [];
      result.groups = result.groups.filter(item => {
        if (!item.projects.length) {
          pull_groups.push(item._id);
        }
        return item.projects.length;
      });
      res.json(result);
      db.project.group.update({
        user_id: req.user._id,
        company_id: req.company._id,
      }, {
        $pull: {
          groups: {
            _id: {$in: pull_groups}
          }
        }
      });
    }));
  })
  .catch(next);
});

api.put('/group/:group_id', (req, res, next) => {
  validate('group', req.body);
  let projects = req.body.projects;
  let group_id = ObjectId(req.params.group_id);
  db.project.group.findOne({
    user_id: req.user._id,
    company_id: req.company._id,
  })
  .then(doc => {
    let groups = doc.groups;
    let names = _.pluck(groups, names);
    if (_.contains(names, req.body.name)) {
      throw new ApiError('400', 'have_same_group_name');
    }
    let promise = _checkExistProjectsReturnChange(req, groups, projects);
    return promise.then(() => db.project.group.findOneAndUpdate({
      user_id: req.user._id,
      company_id: req.company._id,
      'groups._id': group_id
    }, {
      $set: {
        'groups.$.name': req.body.name,
        'groups.$.projects': req.body.projects
      }
    }, {
      returnOriginal: false,
      returnNewDocument: true
    }))
    .then(doc => {
      let result = doc.value;
      let pull_groups = [];
      result.groups = result.groups.filter(item => {
        if (!item.projects.length) {
          pull_groups.push(item._id);
        }
        return item.projects.length;
      });
      res.json(result);
      db.project.group.update({
        user_id: req.user._id,
        company_id: req.company._id,
      }, {
        $pull: {
          groups: {
            _id: {
              $in: pull_groups
            }
          }
        }
      });
    });
  })
  .catch(next);
});

api.delete('/group/projects', (req, res, next) => {
  validate('group', req.body, ['projects']);
  let {projects} = req.body;
  Promise.map(projects, project => {
    return db.project.group.update({
      user_id: req.user._id,
      company_id: req.company._id,
      'groups.projects': project
    }, {
      $pull: {
        'groups.$.projects': project
      }
    });
  })
  .then(() => {
    return db.project.group.findOne({
      user_id: req.user._id,
      company_id: req.company._id,
    })
    .then(doc => {
      let result = doc;
      let pull_groups = [];
      result.groups = result.groups.filter(item => {
        if (!item.projects.length) {
          pull_groups.push(item._id);
        }
        return item.projects.length;
      });
      res.json(result);
      db.project.group.update({
        user_id: req.user._id,
        company_id: req.company._id,
      }, {
        $pull: {
          groups: {
            _id: {
              $in: pull_groups
            }
          }
        }
      });
    });
  })
  .catch(next);
});

api.post('/', (req, res, next) => {
  let data = req.body;
  validate('project', data);
  let companyLevel = new CompanyLevel(req.company._id);
  companyLevel.getProgramLimits().then(limit => {
    if (limit) {
      if (limit == C.PROJECT_QUANTITY_LIMIT.OVER_TOTAL) {
        throw new ApiError(400, C.PROJECT_QUANTITY_LIMIT.OVER_TOTAL);
      } else {
        throw new ApiError(400, C.PROJECT_QUANTITY_LIMIT.OVER_ACTIVED);
      }
    }
    _.extend(data, {
      company_id: req.company._id,
      is_archived: false,
      owner: req.user._id,
      logo: randomAvatar('project'),
      members: [{
        _id: req.user._id,
        type: C.PROJECT_MEMBER_TYPE.OWNER,
        title: ''
      }],
      date_create: new Date(),
    });

    db.project.insert(data)
    .then(doc => {
      req.project = doc;
      return Promise.all([
        db.company.update({
          _id: req.company._id
        }, {
          $push: { projects: doc._id }
        }),
        db.user.update({
          _id: req.user._id
        }, {
          $push: { projects: doc._id }
        }),
        db.document.dir.insert({
          project_id: doc._id,
          parent_dir: null,
          name: '',
          dirs: [],
          files: []
        }).then(root => {
          let extra_dir = {
            name: '附件',
            parent_dir: root._id,
            files: [],
            dirs: [],
            project_id: doc._id,
            updated_by: req.user._id,
            company_id: req.company._id,
            date_create: new Date(),
            date_update: new Date(),
            path: [root._id],
            attachment_dir: true,
          };
          return db.document.dir.insert(extra_dir)
          .then(doc => {
            return db.document.dir.update({
              _id: root._id
            }, {
              $push: {
                dirs: doc._id
              }
            });
          });
        })
      ])
      .then(() => logProject(req, C.ACTIVITY_ACTION.CREATE))
      .then(() => res.json(doc));
    });
  })
  .catch(next);
});

api.param('project_id', (req, res, next, id) => {
  db.project.findOne({
    _id: ObjectId(id),
    company_id: req.company._id,
  })
  .then(project => {
    if (!project) {
      throw new ApiError(404);
    }
    ensureProjectMember(project, req.user._id);
    req.project = project;
    next();
  })
  .catch(next);
});

api.get('/:project_id', (req, res, next) => {
  let data = req.project;
  let owner = data.owner;
  data.is_owner = owner.equals(req.user._id);
  let myself = _.find(req.project.members, m => m._id.equals(req.user._id));
  data.is_admin = myself.type == C.PROJECT_MEMBER_TYPE.ADMIN || data.is_owner;
  _.map(data.members, m => {
    m.user = m._id;
    delete m._id;
    return m;
  });
  Promise.all([
    fetchUserInfo(data, 'owner'),
    fetchUserInfo(data.members, 'user')
  ]).then(() => {
    res.json(data);
    recordUserRecentProjects(req);
  })
  .catch(next);
});

api.put('/:project_id', (req, res, next) => {
  let data = req.body;
  validate('project', data);

  db.project.update({
    _id: ObjectId(req.params.project_id),
    company_id: req.company._id,
  }, {
    $set: data
  })
  .then(doc => res.json(doc))
  .then(() => {
    let update_fields = [];
    if (data.name != req.project.name) {
      update_fields.push(['name', req.project.name, data.name]);
    }
    if (data.description != req.project.description) {
      update_fields.push('description');
    }
    logProject(req, C.ACTIVITY_ACTION.UPDATE, {
      update_fields
    });
  })
  .catch(next);
});

api.delete('/:project_id', authCheck(), (req, res, next) => {
  let project_id = req.project._id;
  let data = req.project;
  if (!req.user._id.equals(data.owner)) {
    throw new ApiError(400, 'forbidden');
  }
  let projectMembers = [];
  data.members && (projectMembers = data.members.map(i => i._id));
  return db.project.remove({
    _id: project_id
  })
  .then(() => {
    return Promise.all([
      db.company.update({
        _id: req.company._id
      }, {
        $pull: {projects: project_id}
      }),
      db.user.update({
        _id: {$in: projectMembers}
      }, {
        $pull: {projects: project_id}
      }),
      db.project.group.update({
        company_id: req.company._id,
        'groups.projects': project_id
      }, {
        $pull: {
          'groups.*.projects': project_id,
        }
      }),
      db.task.find({project_id}, {
        _id: 1
      })
      .then(tasks => (
        Promise.all([
          db.task.comments.remove({
            task_id: {
              $in: tasks.map(task => task._id)
            }
          }),
          db.task.remove({project_id})
        ])
      )),
      db.discussion.remove({
        project_id
      }),
      db.activity.remove({
        project: project_id
      }),
      db.notification.remove({
        project: project_id
      }),
      removeFilesUnderProject(project_id),
    ]);
  })
  .then(() => {
    res.json({});
    // logProject(req, C.ACTIVITY_ACTION.DELETE);
  })
  .catch(next);
});

api.put('/:project_id/logo', (req, res, next) => {
  const data = {
    logo: cropAvatar(req),
  };
  db.project.update({
    _id: req.project._id,
    company_id: req.company._id,
  }, {
    $set: data
  })
  .then(() => {
    res.json(data);
    logProject(req, C.ACTIVITY_ACTION.UPDATE, {
      update_fields: ['logo']
    });
  })
  .catch(next);
});

api.put('/:project_id/logo/upload',
upload({type: 'avatar'}).single('logo'),
saveCdn('cdn-public'),
(req, res, next) => {
  if (!req.file) {
    throw new ApiError(400, 'file_type_error');
  }
  const data = {
    logo: cropAvatar(req),
  };
  db.project.update({
    _id: req.project._id,
    company_id: req.company._id,
  }, {
    $set: data
  })
  .then(() => {
    res.json(data);
    logProject(req, C.ACTIVITY_ACTION.UPDATE, {
      update_fields: ['logo']
    });
  })
  .catch(next);
});

api.get('/:project_id/member', (req, res, next) => {
  let members = req.project.members || [];
  let memberIds = members.map(i => i._id);
  let mergedMembers = [];
  _.each(members, m => {
    let memberInCompany = _.find(req.company.members, cm => cm._id.equals(m._id));
    if (memberInCompany) {
      mergedMembers.push(_.extend(memberInCompany, m));
    }
  });
  mapObjectIdToData(memberIds, 'user', 'name,avatar,email,mobile', '', mergedMembers)
  .then(members => res.json(members))
  .catch(next);
});

api.post('/:project_id/member', (req, res, next) => {
  let project_id = req.project._id;
  let data = req.body;
  data.map(item => {
    validate('member', item);
    item.type = C.PROJECT_MEMBER_TYPE.NORMAL;
  });
  let members = data.map(item => item._id);
  ensureProjectAdmin(req.project, req.user._id);
  data.forEach(item => {
    if (findObjectIdIndex(req.project.members.map(i => i._id), item._id) != -1) {
      throw new ApiError(400, 'member_exists');
    }
  });
  Promise.all([
    db.user.update({
      _id: {
        $in: data.map(i => i._id)
      }
    }, {
      $addToSet: {projects: project_id}
    }, {
      multi: true
    }),
    db.project.update({
      _id: project_id
    }, {
      $push: { members: {$each: data} }
    })
  ])
  .then(() => {
    res.json({});
    logProject(req, C.ACTIVITY_ACTION.ADD, {
      target_type: C.OBJECT_TYPE.PROJECT_MEMBER,
      project_member: members,
    });
    let notification = {
      action: C.ACTIVITY_ACTION.ADD,
      target_type: C.OBJECT_TYPE.PROJECT_MEMBER,
      project: project_id,
      from: req.user._id,
      to: members
    };
    req.model('notification').send(notification, PROJECT_MEMBER_ADD);
  })
  .catch(next);
});

api.put('/:project_id/member/:member_id/type', (req, res, next) => {
  let member_id = ObjectId(req.params.member_id);
  let project_id = req.project._id;
  let type = req.body.type;
  if (type != C.PROJECT_MEMBER_TYPE.ADMIN && type != C.PROJECT_MEMBER_TYPE.NORMAL) {
    throw new ApiError(400, 'wrong_member_type');
  }
  ensureProjectOwner(req.project, req.user._id);
  ensureProjectMember(req.project, member_id);
  return db.project.update({
    _id: project_id,
    'members._id': member_id
  }, {
    $set: {
      'members.$.type': type
    }
  })
  .then(doc => {
    res.json(doc);
    let notification = {
      target_type: C.OBJECT_TYPE.PROJECT,
      project: project_id,
    };
    let activityAction;
    if (type == C.PROJECT_MEMBER_TYPE.ADMIN) {
      activityAction = C.ACTIVITY_ACTION.SET_ADMIN;
    } else {
      activityAction = C.ACTIVITY_ACTION.REMOVE_ADMIN;
    }
    _.extend(notification, {
      action: activityAction,
    });
    logProject(req, activityAction, {
      project_member: member_id,
    });
    req.model('notification').send(_.extend({}, notification, {
      from: req.user._id,
      to: member_id
    }), activityAction == C.ACTIVITY_ACTION.SET_ADMIN ? PROJECT_MEMBER_SETADMIN : PROJECT_MEMBER_REMOVEADMIN);
  })
  .catch(next);
});

api.post('/:project_id/transfer', authCheck(), (req, res, next) => {
  let member_id = ObjectId(req.body.user_id);
  let project_id = req.project._id;
  ensureProjectOwner(req.project, req.user._id);
  ensureProjectMember(req.project, member_id);
  return Promise.all([
    db.project.update({
      _id: project_id,
      'members.type': C.PROJECT_MEMBER_TYPE.OWNER
    }, {
      $set: {
        owner: member_id,
        'members.$.type': C.PROJECT_MEMBER_TYPE.NORMAL
      }
    }),
    db.project.update({
      _id: project_id,
      'members._id': member_id
    }, {
      $set: {
        'members.$.type': C.PROJECT_MEMBER_TYPE.OWNER
      }
    })
  ])
  .then(() => {
    res.json({});
    logProject(req, C.ACTIVITY_ACTION.TRANSFER, {
      project_member: member_id
    });
    let notification = {
      action: C.ACTIVITY_ACTION.TRANSFER,
      target_type: C.OBJECT_TYPE.PROJECT,
      project: project_id,
      from: req.user._id,
      to: member_id
    };
    req.model('notification').send(notification, PROJECT_TRANSFER);
  })
  .catch(next);
});

api.delete('/:project_id/member/:member_id', (req, res, next) => {
  let member_id = ObjectId(req.params.member_id);
  let project_id = req.project._id;
  ensureProjectMember(req.project, member_id);
  let { members } = req.project;
  let self = member_id.equals(req.user._id);
  let admin = members.filter(member => {
    return member._id.equals(req.user._id)
      && (member.type == C.PROJECT_MEMBER_TYPE.OWNER
        || member.type == C.PROJECT_MEMBER_TYPE.ADMIN);
  }).length;
  if (!self && !admin) {
    throw new ApiError(400, 'forbidden');
  }
  db.task.count({
    project_id: project_id,
    assignee: member_id,
    status: C.TASK_STATUS.PROCESSING
  })
  .then(count => {
    if (count) {
      throw new ApiError(400, 'member_task_not_empty');
    }
    return Promise.all([
      db.user.update({
        _id: member_id
      }, {
        $pull: {projects: project_id}
      }),
      db.project.update({
        _id: project_id
      }, {
        $pull: {
          members: { _id: member_id }
        }
      }),
      db.task.update({
        project_id,
        followers: member_id,
      }, {
        $pull: {
          followers: member_id
        }
      }, {
        multi: true
      }),
      db.discussion.update({
        project_id,
        followers: member_id
      }, {
        $pull: {
          followers: member_id
        }
      }, {
        multi: true
      }),
    ]);
  })
  .then(() => {
    res.json({});
    if (self) {
      logProject(req, C.ACTIVITY_ACTION.QUIT, {
        target_type: C.OBJECT_TYPE.PROJECT,
      });
      let notification = {
        action: C.ACTIVITY_ACTION.QUIT,
        target_type: C.OBJECT_TYPE.PROJECT,
        project: project_id,
        from: req.user._id,
        to: members.map(member => member._id).filter(member => !member.equals(req.user._id))
      };
      req.model('notification').send(notification, PROJECT_QUIT);
    } else {
      logProject(req, C.ACTIVITY_ACTION.REMOVE, {
        target_type: C.OBJECT_TYPE.PROJECT_MEMBER,
        project_member: member_id
      });
      let notification = {
        action: C.ACTIVITY_ACTION.REMOVE,
        target_type: C.OBJECT_TYPE.PROJECT_MEMBER,
        project: project_id,
        from: req.user._id,
        to: member_id
      };
      req.model('notification').send(notification, PROJECT_MEMBER_REMOVE);
    }
  })
  .catch(next);
});

api.put('/:project_id/archived', (req, res, next) => {
  let { archived } = req.body;
  archived = !!archived;
  if (archived) {
    return archiveProject(req, res, next, archived);
  }
  let companyLevel = new CompanyLevel(req.company._id);
  companyLevel.getProgramLimits().then(limit => {
    if (limit == C.PROJECT_QUANTITY_LIMIT.OVER_ACTIVED) {
      throw new ApiError(400, C.PROJECT_QUANTITY_LIMIT.OVER_ACTIVED);
    }
    archiveProject(req, res, next, archived);
  }).catch(next);
});

api.post('/:project_id/tag', (req, res, next) => {
  let newTagId;
  fetchTagAndValidTag(req)
  .then(data => {
    data._id = newTagId = ObjectId();
    return db.project.update({
      _id: req.project._id,
    }, {
      $push: {
        tags: data
      }
    });
  })
  .then(() => res.json({
    _id: newTagId
  }))
  .catch(next);
});

api.put('/:project_id/tag/:tag_id', (req, res, next) => {
  let tag_id = ObjectId(req.params.tag_id);
  fetchTagAndValidTag(req, tag_id)
  .then(data => {
    data._id = tag_id;
    return db.project.update({
      _id: req.project._id,
      'tags._id': tag_id
    }, {
      $set: {
        'tags.$': data
      }
    });
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.get('/:project_id/tag', (req, res, next) => {
  db.task.aggregate([
    {$match: { project_id: req.project._id }},
    {$unwind: '$tags'},
    {'$group' : {_id: '$tags', sum: {$sum: 1}}}
  ])
  .then(doc => {
    let tags = req.project.tags || [];
    tags.forEach(tag => {
      let foundTag = _.find(doc, item => tag._id.equals(item._id));
      tag.sum = foundTag ? foundTag.sum : 0;
    });
    res.json(tags);
  })
  .catch(next);
});

api.delete('/:project_id/tag/:tag_id', (req, res, next) => {
  let project_id = req.project._id;
  let tag_id = ObjectId(req.params.tag_id);
  Promise.all([
    db.project.update({
      _id: project_id,
    }, {
      $pull: {
        tags: {
          _id: tag_id
        }
      }
    }),
    db.task.update({
      project_id: project_id,
      'tags': tag_id
    }, {
      $pull: {
        tags: tag_id
      }
    }, {
      multi: true
    })
  ])
  .then(() => res.json({}))
  .catch(next);
});

api.get('/:project_id/activity', (req, res, next) => {
  const project_id = req.project._id;
  const { last_id } = req.query;
  req.model('activity').fetch({
    project: project_id,
  }, last_id)
  .then(list => res.json(list))
  .catch(next);
});

api.get('/:project_id/statistics', (req, res, next) => {
  const project_id = req.project._id;
  db.task.find({
    project_id: project_id,
  }, {
    status: 1,
    assignee: 1,
    date_due: 1,
  })
  .then(list => {
    const now = time();
    const getStatus = item => {
      if (item.status == C.TASK_STATUS.PROCESSING &&
        item.date_due !== null && now > item.date_due) {
        return 'overdue';
      } else {
        return item.status;
      }
    };
    const stats = _.groupBy(list, item => item.assignee.valueOf());
    let memberStats = _.map(stats, (items, assignee) => {
      let stats = _.countBy(items, getStatus);
      stats.total = items.length;
      return {
        assignee: assignee,
        count: stats,
      };
    });
    let projectStats = _.countBy(list, getStatus);
    projectStats.total = list.length;
    return {
      project: projectStats,
      member: memberStats,
    };
  })
  .then(stats => fetchCompanyMemberInfo(req.company, stats, 'member.assignee'))
  .then(stats => res.json(stats))
  .catch(next);
});

function archiveProject(req, res, next, archived) {
  db.project.update({
    _id: req.project._id,
    company_id: req.company._id,
  }, {
    $set: {
      is_archived: archived
    }
  })
  .then(() => {
    res.json({});
    let update = archived ? {
      $set: {
        project_archived: true
      }
    } : {
      $unset: {
        project_archived: 1
      }
    };
    return db.task.update({
      project_id: req.project._id,
    }, update, {
      multi: true
    });
  })
  .then(() => {
    logProject(req, archived ? C.ACTIVITY_ACTION.ARCHIVED : C.ACTIVITY_ACTION.UN_ARCHIVED, {
      field: {
        is_archived: archived
      }
    });
  })
  .catch(next);
}

function logProject(req, action, data) {
  let info = {
    action: action,
    target_type: C.OBJECT_TYPE.PROJECT,
    project: req.project._id,
    creator: req.user._id,
  };
  let activity = _.extend(info, data);
  req.model('activity').insert(activity);
}

function ensureProjectOwner(project, user_id) {
  if (!project.owner.equals(user_id)) {
    throw new ApiError(400, null, 'not_project_owner');
  }
}

function ensureProjectMember(project, user_id) {
  if (!_.find(project.members, member => member._id.equals(user_id))) {
    throw new ApiError(400, 'not_project_member');
  }
}

function ensureProjectAdmin(project, user_id) {
  if (-1 == [C.PROJECT_MEMBER_TYPE.ADMIN, C.PROJECT_MEMBER_TYPE.OWNER]
    .indexOf(_.find(project.members, member => member._id.equals(user_id)).type)) {
    throw new ApiError(400, 'not_project_admin');
  }
}

function fetchTagAndValidTag(req, tag_id) {
  let project_id = req.project._id;
  let data = req.body;
  validate('tag', data);
  return db.project.findOne({
    _id: project_id,
    'tags.name': data.name
  }, {
    'tags.$._id': 1
  })
  .then(project => {
    if (project && (!tag_id || !project.tags[0]._id.equals(tag_id))) {
      throw new ApiError(400, 'tag_exists');
    }
    return data;
  });
}

function removeFilesUnderProject(project_id) {
  return db.document.dir.findOne({
    project_id,
    parent_dir: null,
  }, {
    _id: 1
  })
  .then(rootDir => {
    if (!rootDir) {
      return;
    }
    return fetchFilesUnderDir(rootDir._id)
    .then(files => {
      return db.document.file.find({
        _id: {
          $in: files
        }
      }, {
        path: 1
      })
      .then(fileInfo => {
        return removeFiles(fileInfo.map(info => info.path));
      })
      .then(() => {
        return db.document.file.remove({
          _id: {
            $in: files
          }
        });
      });
    });
  });
}

function removeFiles(filePathList) {
  try {
    filePathList.forEach(path => fs.unlink(path, e => e && console.error(e)));
  } catch (e) {
    console.error(e);
  }
}

function fetchFilesUnderDir(dir, files) {
  files = files || [];
  dir = ObjectId.isValid(dir) ? [dir] : dir;
  if (!dir || !dir.length) {
    return Promise.resolve(files);
  }
  return db.document.dir.find({
    _id: {
      $in: dir
    }
  }, {
    files: 1,
    dirs: 1,
  })
  .then(doc => {
    files = files.concat(_.flatten(doc.map(item => item.files)) || []);
    let dirs = _.flatten(doc.map(item => item.dirs)).filter(i => ObjectId.isValid(i));
    return fetchFilesUnderDir(dirs, files);
  })
  .then(files => files);
}

function recordUserRecentProjects(req) {
  db.user.findOne({
    _id: req.user._id,
    'recent.projects.project_id': req.project._id,
  }).then(doc => {
    if(!doc) {
      return db.user.update({
        _id: req.user._id
      }, {
        $push: {
          'recent.projects': {
            project_id: req.project._id,
            date: new Date()
          }
        }
      });
    }
    db.user.update({
      _id: req.user._id,
      'recent.projects.project_id': req.project._id,
    }, {
      $set: {
        'recent.projects.$.date': new Date()
      }
    });
  });
}

function _checkExistProjectsReturnChange(req, groups, projects) {
  let group_project = _.flatten(_.pluck(groups, 'projects'));
  let exists_project = [];
  if (projects && projects.length && group_project && group_project.length) {
    for (let i = 0; i < projects.length; i++) {
      for (let a = 0; a < group_project.length; a++) {
        if(projects[i].equals(group_project[a])) {
          exists_project.push(projects[i]);
        }
      }
    }
  }
  let promise;
  if (exists_project.length) {
    promise = Promise.map(exists_project, project => {
      return db.project.group.update({
        user_id: req.user._id,
        company_id: req.company._id,
        'groups.projects': project,
      }, {
        $pull: {
          'groups.$.projects': project
        }
      });
    });
  } else {
    promise = Promise.resolve();
  }
  return promise;
}

api.use('/:project_id/task', require('./task').default);
api.use('/:project_id/discussion', require('./discussion').default);
api.use('/:project_id/document', require('../document').default);
