import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';

import { ApiError } from '../../lib/error';
import { userId } from '../../lib/utils';
import { sanitizeObject, validateObject } from '../../lib/inspector';
import { projectSanitization, projectValidation, memberSanitization, memberValidation } from './schema';

/* company collection */
let api = require('express').Router();
export default api;

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
  sanitizeObject(projectSanitization, data);
  let result = validateObject(projectValidation, data);
  if (!result.valid) {
    return next(new ApiError(400, null, result.error))
  }

  _.extend(data, {
    company_id: req.company._id,
    is_archived: false,
    owner: userId(),
    members: [{
      _id: userId(),
      type: 3,
      title: ''
    }],
    date_create: new Date(),
  });

  db.project.insert(data)
  .then(doc => {
    db.company.update({
      _id: req.company._id
    }, {
      $push: { projects: doc._id }
    });
    res.json(doc);
  })
  .catch(next);
});

api.get('/:_id', (req, res, next) => {
  let project_id = ObjectId(req.params._id);
  db.project.findOne({
   company_id: req.company._id,
   _id: project_id
 })
 .then(data => {
   if (!data) {
     throw new ApiError(404);
   }
   res.json(data);
 })
 .catch(next);
});

api.param('project_id', (req, res, next, id) => {
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
  sanitizeObject(projectSanitization, data);
  let result = validateObject(projectValidation, data);
  if (!result.valid) {
    return next(new ApiError(400, null, result.error))
  }

  db.project.update({
    _id: ObjectId(req.params.project_id)
  }, {
    $set: data
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.delete('/:project_id', (req, res, next) => {
  db.project.remove({
    _id: ObjectId(req.params.project_id)
  })
  .then(doc => {
    db.company.update({
      _id: req.company._id
    }, {
      $pull: { projects: doc._id }
    });
    res.json({});
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
   res.json(data['members'] || []);
 })
 .catch(next);
});

api.post('/:project_id/member', (req, res, next) => {
  let project_id = ObjectId(req.params.project_id);
  let data = req.body;

  sanitizeObject(memberSanitization, data);
  let result = validateObject(memberValidation, data);
  if (!result.valid) {
    return next(new ApiError(400, null, result.error));
  }

  db.project.count({
    _id: project_id,
    'members._id': data._id
  })
  .then(count => {
    if (0 != count) {
      console.log(count)
      return next(new ApiError(400, null, 'member is exist'));
    }
    db.project.update({
      _id: project_id
    }, {
      $push: { members: data }
    })
    .then(data => {
      res.json(data);
    })
    .catch(next);
  })
  .catch(next);
});

api.delete('/:project_id/member/:member_id', (req, res, next) => {
  db.project.count({
    _id: ObjectId(req.params.project_id),
    'members._id': ObjectId(req.params.member_id)
  })
  .then(count => {
    if (0 == count) {
      throw new ApiError(404);
    }
    db.project.update({
      _id: ObjectId(req.params.project_id)
    }, {
      $pull: {
        members: { _id: ObjectId(req.params.member_id) }
      }
    })
    .then(doc => res.json({}))
    .catch(next);
  })
  .catch(next);
});
