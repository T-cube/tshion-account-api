import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';

import { ApiError } from 'lib/error';
import { sanitizeValidateObject } from 'lib/inspector';
import { projectSanitization, projectValidation, memberSanitization, memberValidation } from './schema';
import C from 'lib/constants';
import { oauthCheck } from 'lib/middleware';

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
   data.is_owner = owner == req.user._id;
   data.is_admin = false;
   req.company.members.forEach(i => {
     if (i._id == req.user._id && i.type == C.PROJECT_MEMBER_TYPE.ADMIN) {
       data.is_admin = true;
     }
   })
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
    _id: ObjectId(req.params.project_id)
  }, {
    $set: data
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.delete('/:_project_id', (req, res, next) => {
  let object_id = ObjectId(req.params._project_id);
  db.project.findOne({_id: object_id}, {members: 1, _id: 0, owner: 1})
  .then(data => {
    if (!data) {
      throw new ApiError(400);
    }
    if (!req.user._id.equals(data.owner)) {
      throw new ApiError(403);
    }
    let projectMembers = [];
    data.members && (projectMembers = data.members.map(i => i._id));
    db.project.remove({
      _id: object_id
    })
    .then(doc => {
      return Promise.all([
        db.company.update({
          _id: req.company._id
        }, {
          $pull: {projects: object_id}
        }),
        db.user.update({
          _id: {$in: projectMembers}
        }, {
          $pull: {projects: object_id}
        }),
      ])
      .then(() => res.json({}));
    })
    .catch(next);
  })
  .catch(next);
});

api.get('/:project_id/member', (req, res, next) => {
  let project_id = ObjectId(req.params.project_id);
  db.project.findOne({
    _id: project_id
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
     avatar: 1
   })
   .then(memberInfo => {
     members = members.map(i => {
       let info = _.find(memberInfo, j => {
         return i._id == j._id;
       });
       i.name = info.name;
       i.avatar = info.avatar;
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

  sanitizeValidateObject(memberSanitization, memberValidation, data);

  db.project.count({
    _id: project_id,
    'members._id': data._id
  })
  .then(count => {
    if (0 != count) {
      throw new ApiError(400, null, 'member is exists');
    }
    db.user.update({
      _id: data._id
    }, {
      $push: {projects: project_id}
    })
    .then(() => {
      return db.project.update({
        _id: project_id
      }, {
        $push: { members: data }
      });
    })
    .then(data => {
      res.json(data);
    })
    .catch(next);
  })
  .catch(next);
});

api.delete('/:_project_id/member/:member_id', (req, res, next) => {
  let member_id = ObjectId(req.params.member_id);
  let project_id = ObjectId(req.params._project_id);
  db.project.findOne({_id: project_id}, {members: 1})
  .then(data => {
    if (!data) {
      throw new ApiError(404);
    }
    let { members } = data;
    let allowed = members.filter(member => {
      return member._id.equals(req.user._id) || (member.type == C.PROJECT_MEMBER_TYPE.OWNER || member.type == C.PROJECT_MEMBER_TYPE.ADMIN);
    }).length;
    if (!allowed) {
      throw new ApiError(403);
    }
    if (req.user._id.equals(member_id)) {
      throw new ApiError(400, null, 'can not delete self');
    }
    let exists = members.filter(member => {
      return member._id.equals(member_id);
    }).length;
    if (!exists) {
      throw new ApiError(400);
    }
    db.user.update({
      _id: data._id
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

api.put('/:project_id/archived',  (req, res, next) => {
  let { archived } = req.body;
  archived = !!archived;
  db.project.update({
    _id: ObjectId(req.params.project_id)
  }, {
    $set: {
      is_archived: archived
    }
  })
  .then(doc => res.json(doc))
  .catch(next);
})

api.use('/:project_id/task', require('./task').default);
