import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';

import { ApiError } from 'lib/error';
import { sanitizeValidateObject } from 'lib/inspector';
import { sanitization, validation } from './schema';
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
  let condition = {};
  
  db.task.find({
    project_id: req.project_id
  })
  .then(data => {
    res.json(data || []);
  })
  .catch(next);
})

api.post('/', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(sanitization, validation, data);
  _.extend(data, {
    creator: req.user._id,
    followers: [],
    company_id: req.company._id,
    project_id: req.project_id,
    time_create: new Date(),
    subtask: []
  });
  db.task.insert(data)
  .then(doc => {
    res.json(doc);
  })
  .catch(next);
});

api.get('/:_task_id', (req, res, next) => {
  db.task.findOne({
    _id: ObjectId(req.params._task_id),
    project_id: req.project_id,
  })
  .then(data => {
    if (!data) {
      throw new ApiError(404);
    }
    res.json(data);
  })
  .catch(next);
})

api.param('task_id', (req, res, next, id) => {
  db.task.count({
    _id: ObjectId(req.params.task_id),
    project_id: req.project_id,
  })
  .then(count => {
    if (count == 0) {
      throw new ApiError(400);
    }
    next();
  })
  .catch(next)
})

api.put('/:task_id/status', updateField('status'), (req, res, next) => {
  res.json({});
});

api.put('/:task_id/title', updateField('title'), (req, res, next) => {
  res.json({});
});

api.put('/:task_id/description', updateField('description'), (req, res, next) => {
  res.json({});
});

api.put('/:task_id/assignee', (req, res, next) => {
  let data = validField('assignee', req);
  Promise.all([
    isMemberOfProject(data.assignee, req.project_id).catch(next),
    db.task.count({
      _id: ObjectId(req.params.task_id),
      assignee: data.assignee
    })
    .then(count => {
      if (count) {
        throw new ApiError(400, null, 'can not set assignee to assignee');
      }
    })
    .catch(next)
  ])
  .then(() => next())
  .catch(next);
}, updateField('assignee'), (req, res, next) => {
  res.json({});
});

api.put('/:task_id/date_start', updateField('date_start'), (req, res, next) => {
  res.json({});
});

api.put('/:task_id/date_due', updateField('date_due'), (req, res, next) => {
  res.json({});
});

api.post('/:task_id/tag', (req, res, next) => {
  //TODO
  let data = validField('tag', req);
  db.task.update({
    _id: ObjectId(req.params.task_id)
  }, {
    $push: data
  })
  .then(result => res.json(result))
  .catch(next);
});

api.delete('/:task_id/tag/:tag_id', (req, res, next) => {
  //TODO
  db.task.update({
    _id: ObjectId(req.params.task_id)
  }, {
    $pull: {
      tag: ObjectId(req.params.tag_id)
    }
  })
  .then(result => {
    console.log(result);
    res.json(result);
  })
  .catch(next);
});

api.post('/:task_id/followers', (req, res, next) => {
  let user_id = req.body._id;
  if (ObjectId.isValid(user_id)) {
    user_id = ObjectId(user_id);
  } else {
    throw new ApiError(400);
  }
  isMemberOfProject(user_id, req.project_id).then(() => {
    db.task.update({
      _id: ObjectId(req.params.task_id)
    }, {
      $addToSet: {
        followers: user_id
      }
    })
    .then(result => res.json(result))
    .catch(next);
  })
  .catch(next);
});



function updateField(field) {
  return (req, res, next) => {
    let data = validField(field, req.body[field]);
    db.task.update({
      _id: ObjectId(req.params.task_id)
    }, {
      $set: data
    })
    .then(() => next())
    .catch(() => next('route'));
  }
}

function validField(field, val) {
  let data = {[field]: val};
  let fieldSanitization = _.pick(sanitization, field);
  let fieldValidation = _.pick(validation, field);
  sanitizeValidateObject(fieldSanitization, fieldValidation, data);
  return data;
}

function isMemberOfProject(user_id, project_id) {
  return db.project.count({
    _id: project_id,
    'members._id': user_id
  })
  .then(count => {
    if (count == 0) {
      throw new ApiError(400, null, 'user is not one of the project member')
    }
  });
}
