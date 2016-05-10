import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';

import upload, { randomAvatar } from 'lib/upload';
import { ApiError } from 'lib/error';
import { sanitizeValidateObject } from 'lib/inspector';
import {
  projectSanitization,
  projectValidation,
  memberSanitization,
  memberValidation,
  tagSanitization,
  tagValidation,
} from './schema';
import C, { ENUMS } from 'lib/constants';
import { oauthCheck, authCheck } from 'lib/middleware';

/* company collection */
let api = require('express').Router();
export default api;

api.use(oauthCheck());

api.use((req, res, next) => {
  next();
});

api.get('/', (req, res, next) => {
  db.project.find({
    company_id: req.company._id,
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
    ]).then(() => {
      res.json(doc);
    });
  })
  .catch(next);
});

api.get('/:_project_id', (req, res, next) => {
  let project_id = ObjectId(req.params._project_id);
  db.project.findOne({
   company_id: req.company._id,
   _id: project_id
 })
 .then(data => {
   if (!data) {
     throw new ApiError(404);
   }
   let owner = data.owner;
   data.is_owner = owner.equals(req.user._id);
   let myself = _.find(req.company.members, m => m._id.equals(req.user._id));
   data.is_admin = myself.type == C.PROJECT_MEMBER_TYPE.ADMIN || data.is_owner;
   data.owner = _.find(req.company.members, member => {
     return member._id.equals(owner);
   });
   res.json(data);
 })
 .catch(next);
});

api.param('project_id', (req, res, next, id) => {
  req.project_id = ObjectId(id);
  db.project.count({
    company_id: req.company._id,
    _id: ObjectId(id)
  })
  .then(count => {
    if (0 == count) {
      throw new ApiError(404);
    }
    next();
  })
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
  .catch(next);
});

api.delete('/:_project_id', authCheck(), (req, res, next) => {
  let project_id = ObjectId(req.params._project_id);
  db.project.findOne({
    _id: project_id,
    company_id: req.company._id,
  }, {
    members: 1,
    _id: 0,
    owner: 1
  })
  .then(data => {
    if (!data) {
      throw new ApiError(400);
    }
    if (!req.user._id.equals(data.owner)) {
      throw new ApiError(403);
    }
    let projectMembers = [];
    data.members && (projectMembers = data.members.map(i => i._id));
    return db.project.remove({
      _id: project_id
    })
    .then(doc => {
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
      ])
      .then(() => res.json({}));
    })
  })
  .catch(next);
});

api.put('/:project_id/logo', upload({type: 'avatar'}).single('logo'),
(req, res, next) => {
  if (!req.file) {
    throw new ApiError(400, null, 'file type not allowed');
  }
  let data = {
    logo: req.file.url
  };
  db.project.update({
    _id: req.project_id,
    company_id: req.company._id,
  }, {
    $set: data
  })
  .then(() => res.json(data))
  .catch(next);
});

api.get('/:project_id/member', (req, res, next) => {
  let project_id = ObjectId(req.params.project_id);
  db.project.findOne({
    _id: project_id,
    company_id: req.company._id,
  }, {
    members: 1,
    _id: 0
 })
 .then(data => {
   let members = data.members;
   let memberIds = members.map(i => i._id);
   db.user.find({
     _id: {
       $in: memberIds
     }
   }, {
     name: 1,
     avatar: 1,
     email: 1,
     mobile: 1
   })
   .then(memberInfo => {
     members = members.map(i => {
       let info = _.find(memberInfo, j => i._id.equals(j._id));
       if (info) {
         i.name = info.name;
         i.avatar = info.avatar;
         i.email = info.email;
         i.mobile = info.mobile;
       }
       return i;
     });
     res.json(members || []);
   })
   .catch(next)
 })
 .catch(next);
});

api.post('/:project_id/member', (req, res, next) => {
  let project_id = ObjectId(req.params.project_id);
  let data = req.body;

  data.map(item => {
    sanitizeValidateObject(memberSanitization, memberValidation, item);
    item.type = C.PROJECT_MEMBER_TYPE.NORMAL;
  });
  isAdminOfProject(req.user._id, project_id)
  .then(() => {
    return db.project.count({
      _id: project_id,
      'members._id': {
        $in: data.map(i => i._id)
      }
    })
    .then(count => {
      if (0 != count) {
        throw new ApiError(400, null, 'member is exists');
      }
      return db.user.update({
        _id: {
          $in: data.map(i => i._id)
        }
      }, {
        $addToSet: {projects: project_id}
      })
      .then(result => {
        return db.project.update({
          _id: project_id
        }, {
          $push: { members: {$each: data} }
        });
      })
      .then(data => {
        res.json(data);
      })
    })
  })
  .catch(next);
});

api.put('/:_project_id/member/:member_id/type', (req, res, next) => {
  let member_id = ObjectId(req.params.member_id);
  let project_id = ObjectId(req.params._project_id);
  let type = req.body.type;
  if (type != C.PROJECT_MEMBER_TYPE.ADMIN && type != C.PROJECT_MEMBER_TYPE.NORMAL) {
    throw new ApiError(400, null, 'wrong type');
  }
  isOwnerOfProject(req.user._id, project_id)
  .then(() => {
    return db.project.update({
      _id: project_id,
      'members._id': member_id
    }, {
      $set: {
        'members.$.type': type
      }
    })
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.post('/:_project_id/transfer', authCheck(), (req, res, next) => {
  let member_id = ObjectId(req.body.user_id);
  let project_id = ObjectId(req.params._project_id);
  isOwnerOfProject(req.user._id, project_id)
  .then(() => {
    isMemberOfProject(member_id, project_id)
    .then(() => {
      return db.project.update({
        _id: project_id,
        'members.type': C.PROJECT_MEMBER_TYPE.OWNER
      }, {
        $set: {
          owner: member_id,
          'members.$.type': C.PROJECT_MEMBER_TYPE.NORMAL
        }
      })
    })
    .then(() => {
      return db.project.update({
        _id: project_id,
        'members._id': member_id
      }, {
        $set: {
          'members.$.type': C.PROJECT_MEMBER_TYPE.OWNER
        }
      })
    })
    .then(doc => res.json(doc))
    .catch(next);
  })
  .catch(next);
});

api.delete('/:_project_id/member/:member_id', (req, res, next) => {
  let member_id = ObjectId(req.params.member_id);
  let project_id = ObjectId(req.params._project_id);
  db.project.findOne({
    _id: project_id,
    company_id: req.company._id,
  }, {
    members: 1
  })
  .then(data => {
    if (!data) {
      throw new ApiError(404);
    }
    let { members } = data;
    let allowed = member_id.equals(req.user._id) || members.filter(member => {
      return member._id.equals(req.user._id)
        && (member.type == C.PROJECT_MEMBER_TYPE.OWNER
          || member.type == C.PROJECT_MEMBER_TYPE.ADMIN);
    }).length;
    if (!allowed) {
      throw new ApiError(403);
    }
    let exists = members.filter(member => member._id.equals(member_id)).length;
    if (!exists) {
      throw new ApiError(400);
    }
    db.user.update({
      _id: member_id
    }, {
      $pull: {projects: project_id}
    })
    .then(doc => {
      return db.project.update({
        _id: project_id
      }, {
        $pull: {
          members: { _id: member_id }
        }
      });
    })
    .then(doc => res.json({}))
    .catch(next);
  })
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
  let project_id = ObjectId(req.params.project_id);
  let data = req.body;
  sanitizeValidateObject(tagSanitization, tagValidation, data);
  db.project.count({
    _id: project_id,
    company_id: req.company._id,
    'tags.name': data.name
  })
  .then(count => {
    if (count != 0) {
      throw new ApiError(400, null, 'tag is already exists');
    }
    data._id = ObjectId();
    return db.project.update({
      _id: project_id,
      company_id: req.company._id,
    }, {
      $push: {
        tags: data
      }
    });
  })
  .then(() => res.json({
    _id: data._id
  }))
  .catch(next);
});

api.get('/:project_id/tag', (req, res, next) => {
  let project_id = ObjectId(req.params.project_id);
  db.project.findOne({
    _id: project_id,
    company_id: req.company._id,
  }, {
    tags: 1
  })
  .then(doc => res.json(doc.tags))
  .catch(next);
});

api.delete('/:project_id/tag/:tag_id', (req, res, next) => {
  let project_id = ObjectId(req.params.project_id);
  let tag_id = ObjectId(req.params.tag_id);
  db.project.update({
    _id: project_id,
    company_id: req.company._id,
  }, {
    $pull: {
      tags: {
          _id: tag_id
      }
    }
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.post('/:project_id/file',
  upload({type: 'attachment'}).single('document'),
  (req, res, next) => {
    let data = req.body;
    let project_id = ObjectId(req.params.project_id);
    sanitizeValidateObject(fileSanitization, fileValidation, data);
    _.extend(data, {
      project_id: project_id,
      author: req.user._id,
      date_update: new Date(),
      date_create: new Date(),
    });
    if (req.file) {
      _.extend(data, {
        mimetype: req.file.mimetype,
        path: req.file.path,
      });
    }
    db.document.file.insert(data)
    .then(doc => {
      res.json(doc);
      return db.project.update({
        _id: project_id,
        company_id: req.company._id,
      }, {
        $push: {
          files: doc._id
        }
      })
    })
    .catch(next);
});

api.get('/:project_id/file', (req, res, next) => {
  let project_id = ObjectId(req.params.project_id);
  db.project.findOne({
    _id: project_id,
    company_id: req.company._id,
  }, {
    files: 1
  })
  .then(doc => {
    if (!doc) {
      throw new ApiError(404);
    }
    if (!doc.files || !doc.files.length) {
      return res.json([]);
    }
    return db.document.file.find({
      _id: {
        $in: doc.files
      }
    }, {
      title: 1,
      description: 1,
      author: 1,
      author: 1,
      date_update: 1,
    })
    .then(files => res.json(files))
  })
  .catch(next);
});

api.get('/:project_id/file/:file_id/download', (req, res, next) => {
  let project_id = ObjectId(req.params.project_id);
  let file_id = ObjectId(req.params.file_id);
  db.document.file.findOne({
    _id: file_id,
    project_idproject_id: project_id,
  })
  .then(file => {
    if (!file) {
      throw new ApiError(404);
    }
    download(file.path); // TODO
  })
  .catch(next)
});

api.delete('/:project_id/file/:file_id', (req, res, next) => {
  let project_id = ObjectId(req.params.project_id);
  let file_id = ObjectId(req.params.file_id);
  db.project.update({
    _id: project_id,
    company_id: req.company._id,
  }, {
    $pull: {
      files: file_id
    }
  })
  .then(doc => {
    return db.document.file.remove({
      _id: file_id,
      project_id: project_id,
    })
  })
  .then(() => res.json({}))
  .catch(next)
});

function isMemberOfProject(user_id, project_id) {
  return db.project.count({
    _id: project_id,
    'members._id': user_id
  })
  .then(count => {
    if (count == 0) {
      throw new ApiError(400, null, 'user is not one of the project member');
    }
  });
}

function isOwnerOfProject(user_id, project_id) {
  return db.project.count({
    _id: project_id,
    owner: user_id
  })
  .then(count => {
    if (count == 0) {
      throw new ApiError(400, null, 'user is not owner of the project');
    }
  });
}

function isAdminOfProject(user_id, project_id) {
  return db.project.findOne({
    _id: project_id,
    'members._id': user_id
  }, {
    members: 1
  })
  .then(data => {
    if (!data || -1 == [C.PROJECT_MEMBER_TYPE.ADMIN, C.PROJECT_MEMBER_TYPE.OWNER]
      .indexOf(_.find(data.members, member => member._id.equals(user_id)).type)) {
      throw new ApiError(400, null, 'user is not admin of the project');
    }
  });
}

api.use('/:project_id/task', require('./task').default);
