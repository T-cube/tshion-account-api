import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';
import fs from 'fs';

import db from 'lib/database';
import upload, { randomAvatar } from 'lib/upload';
import { ApiError } from 'lib/error';
import C from 'lib/constants';
import { authCheck } from 'lib/middleware';
import { time, fetchCompanyMemberInfo, indexObjectId, mapObjectIdToData } from 'lib/utils';
import { sanitizeValidateObject } from 'lib/inspector';
import {
  projectSanitization,
  projectValidation,
  memberSanitization,
  memberValidation,
  tagSanitization,
  tagValidation,
} from './schema';

/* company collection */
let api = express.Router();
export default api;

api.use((req, res, next) => {
  next();
});

api.get('/', (req, res, next) => {
  db.project.find({
    company_id: req.company._id,
  }, {
    name: 1,
    description: 1,
    logo: 1,
  })
  .then(doc => res.json(doc))
  .catch(next);
  // let projects = req.company.projects || [];
  // db.project.find({_id:{$in: projects}})
  // .then(list => res.json(list));
});

api.post('/', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(projectSanitization, projectValidation, data);

  _.extend(data, {
    company_id: req.company._id,
    is_archived: false,
    owner: req.user._id,
    logo: randomAvatar('project', 14),
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
    ])
    .then(() => logProject(req, C.ACTIVITY_ACTION.CREATE))
    .then(() => res.json(doc));
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
  let myself = _.find(req.company.members, m => m._id.equals(req.user._id));
  data.is_admin = myself.type == C.PROJECT_MEMBER_TYPE.ADMIN || data.is_owner;
  fetchCompanyMemberInfo(req.company.members, data, 'owner')
  .then(data => res.json(data))
  .catch(next);
});

api.put('/:project_id', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(projectSanitization, projectValidation, data);
  db.project.update({
    _id: ObjectId(req.params.project_id),
    company_id: req.company._id,
  }, {
    $set: data
  })
  .then(doc => res.json(doc))
  .then(() => logProject(req, C.ACTIVITY_ACTION.UPDATE))
  .catch(next);
});

api.delete('/:project_id', authCheck(), (req, res, next) => {
  let project_id = req.project._id;
  let data = req.project;
  if (!req.user._id.equals(data.owner)) {
    throw new ApiError(403);
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
      db.task.remove({
        project_id
      }),
      db.discussion.remove({
        project_id
      }),
      removeFilesUnderProject(project_id),
    ]);
  })
  .then(() => {
    res.json({});
    logProject(req, C.ACTIVITY_ACTION.DELETE);
  })
  .catch(next);
});

api.put('/:project_id/logo', (req, res, next) => {
  let { logo } = req.body;
  let data = {
    logo: logo,
  };
  db.project.update({
    _id: req.project._id,
    company_id: req.company._id,
  }, {
    $set: data
  })
  .then(() => res.json(data))
  .catch(next);
});

api.put('/:project_id/logo/upload', upload({type: 'avatar'}).single('logo'),
(req, res, next) => {
  if (!req.file) {
    throw new ApiError(400, null, 'file type not allowed');
  }
  let data = {
    logo: req.file.url
  };
  db.project.update({
    _id: req.project._id,
    company_id: req.company._id,
  }, {
    $set: data
  })
  .then(() => res.json(data))
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
    sanitizeValidateObject(memberSanitization, memberValidation, item);
    item.type = C.PROJECT_MEMBER_TYPE.NORMAL;
  });
  ensureProjectAdmin(req.project, req.user._id);
  data.forEach(item => {
    if (indexObjectId(req.project.members.map(i => i._id), item._id) != -1) {
      throw new ApiError(400, null, 'member is exists');
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
  .then(() => res.json({}))
  .catch(next);
});

api.put('/:project_id/member/:member_id/type', (req, res, next) => {
  let member_id = ObjectId(req.params.member_id);
  let project_id = req.project._id;
  let type = req.body.type;
  if (type != C.PROJECT_MEMBER_TYPE.ADMIN && type != C.PROJECT_MEMBER_TYPE.NORMAL) {
    throw new ApiError(400, null, 'wrong type');
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
  .then(doc => res.json(doc))
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
  .then(() => res.json({}))
  .catch(next);
});

api.delete('/:project_id/member/:member_id', (req, res, next) => {
  let member_id = ObjectId(req.params.member_id);
  let project_id = req.project._id;
  ensureProjectMember(req.project, member_id);
  let { members } = req.project;
  let allowed = member_id.equals(req.user._id) || members.filter(member => {
    return member._id.equals(req.user._id)
      && (member.type == C.PROJECT_MEMBER_TYPE.OWNER
        || member.type == C.PROJECT_MEMBER_TYPE.ADMIN);
  }).length;
  if (!allowed) {
    throw new ApiError(403);
  }
  db.task.count({
    project_id: project_id,
    assignee: member_id,
    status: C.TASK_STATUS.PROCESSING
  })
  .then(count => {
    if (count) {
      throw new ApiError(400, null, '用户还有待处理的任务');
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
      })
    ]);
  })
  .then(() => res.json({}))
  .catch(next);
});

api.put('/:project_id/archived', (req, res, next) => {
  let { archived } = req.body;
  archived = !!archived;
  db.project.update({
    _id: ObjectId(req.params.project_id),
    company_id: req.company._id,
  }, {
    $set: {
      is_archived: archived
    }
  })
  .then(doc => res.json(doc))
  .catch(next);
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
      let member = _.find(req.company.members, m => assignee == m._id.valueOf());
      let stats = _.countBy(items, getStatus);
      stats.total = items.length;
      return {
        assignee: _.pick(member, '_id', 'name'),
        count: stats,
      };
    });
    let projectStats = _.countBy(list, getStatus);
    projectStats.total = list.length;
    res.json({
      project: projectStats,
      member: memberStats,
    });
  })
  .catch(next);
});

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
    throw new ApiError(400, null, 'user is not owner of the project');
  }
}

function ensureProjectMember(project, user_id) {
  if (indexObjectId(project.members.map(i => i._id), user_id) == -1) {
    throw new ApiError(400, null, 'not the member of this project');
  }
}

function ensureProjectAdmin(project, user_id) {
  if (-1 == [C.PROJECT_MEMBER_TYPE.ADMIN, C.PROJECT_MEMBER_TYPE.OWNER]
    .indexOf(_.find(project.members, member => member._id.equals(user_id)).type)) {
    throw new ApiError(400, null, 'user is not admin of the project');
  }
}

function fetchTagAndValidTag(req, tag_id) {
  let project_id = req.project._id;
  let data = req.body;
  sanitizeValidateObject(tagSanitization, tagValidation, data);
  return db.project.findOne({
    _id: project_id,
    'tags.name': data.name
  }, {
    'tags.$._id': 1
  })
  .then(project => {
    if (project && (!tag_id || !project.tags[0]._id.equals(tag_id))) {
      throw new ApiError(400, null, 'tag is already exists');
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
    filePathList.forEach(path => fs.unlinkSync(path));
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

api.use('/:project_id/task', require('./task').default);
api.use('/:project_id/discussion', require('./discussion').default);
api.use('/:project_id/document', require('../document').default);
