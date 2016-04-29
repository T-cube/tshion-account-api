import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';

import { ApiError } from 'lib/error';
import { sanitizeValidateObject } from 'lib/inspector';
import { sanitization, validation, commentSanitization, commentValidation, logSanitization, logValidation } from './schema';
import C, { ENUMS } from 'lib/constants';
import { oauthCheck } from 'lib/middleware';

/* company collection */
let api = require('express').Router();
export default api;

api.use(oauthCheck());

api.use((req, res, next) => {
  next();
});

// TODO page
api.get('/', (req, res, next) => {
  let condition = {
    project_id: req.project_id
  };
  let { keyword, sort, order, status, assignee, creator, follower} = req.query;
  let idItems = _.pick(req.query, 'assignee', 'creator', 'follower');
  _.each(idItems, (item, key) => {
    item = item ? item.split(',').filter(i => ObjectId.isValid(i)).map(i => ObjectId(i)) : [];
    item.length && (condition[key] = { $in: item });
  });
  status = status ? status.split(',').filter(i => ENUMS.TASK_STATUS.indexOf(i) != -1) : [];
  status.length && (condition['status'] = { $in: status });
  keyword && (condition['$text'] = { $search: keyword });
  if (sort && -1 != ['title', 'assignee', 'creator', 'follower'].indexOf(sort)) {
    order = order == 'desc' ? -1 : 1;
    db.task.find(condition).sort({ [sort]: order })
    .then(data => res.json(data || []))
    .catch(next);
    return;
  }
  db.task.find(condition)
  .then(data => res.json(data || []))
  .catch(next);
})

api.post('/', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(sanitization, validation, data);
  let assignee = data.assignee;
  _.extend(data, {
    creator: req.user._id,
    followers: [req.user._id],
    company_id: req.company._id,
    project_id: req.project_id,
    time_create: new Date(),
    subtask: []
  });
  db.task.insert(data)
  .then(doc => {
    db.user.update({
      _id: req.user._id
    }, {
      $push: {
        task: {
          _id: doc._id,
          company_id: req.company._id,
          project_id: req.project_id,
          is_creator: true,
          is_assignee: assignee == req.user._id
        }
      }
    })
    .then(() => {
      if (assignee == req.user._id) {
        return;
      }
      return db.user.update({
        _id: assignee
      }, {
        $push: {
          task: {
            _id: doc._id,
            company_id: req.company._id,
            project_id: req.project_id,
            is_creator: false,
            is_assignee: true
          }
        }
      })
    })
    .then(() => logTask(doc._id, C.TASK_LOG_TYPE.CRAEATE, req.user._id))
    .then(() => {
      res.json(doc);
    })
    .catch(next);
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
});

api.delete('/:task_id', (req, res, next) => {
  db.task.remove({
    _id: ObjectId(req.params.task_id)
  })
  .then(data => res.json(data))
  .catch(next);
});

api.param('task_id', (req, res, next, id) => {
  db.task.count({
    _id: ObjectId(req.params.task_id),
    project_id: req.project_id,
  })
  .then(count => {
    if (count == 0) {
      throw new ApiError(404);
    }
    next();
  })
  .catch(next)
})

api.put('/:task_id/status', updateField('status'), (req, res, next) => {
  res.json({});
});

api.put('/:task_id/title', updateField('title'), (req, res, next) => {
  logTask(ObjectId(req.params.task_id), C.TASK_LOG_TYPE.TITLE, req.user._id)
  .then(() => res.json({}))
  .catch(next);
});

api.put('/:task_id/description', updateField('description'), (req, res, next) => {
  logTask(ObjectId(req.params.task_id), C.TASK_LOG_TYPE.DESCRIPTION, req.user._id)
  .then(() => res.json({}))
  .catch(next);
});

api.put('/:task_id/assignee', (req, res, next) => {
  let data = validField('assignee', req.body.assignee);
  let task_id = ObjectId(req.params.task_id);
  isMemberOfProject(data.assignee, req.project_id)
  .then(doc => {
    return db.task.findOne({
      _id: task_id
    }, {
      assignee: 1
    });
  })
  .then(doc => {
    if (doc.assignee.equals(data.assignee)) {
      res.json({});
      return next();
    }
    return db.user.update({
      _id: doc.assignee,
      'task._id': task_id
    }, {
      $set: {
        'task.$.is_assignee': false
      }
    });
  })
  .then(doc => {
    return db.user.count({
      _id: req.user._id,
      'task._id': task_id
    })
  })
  .then(count => {
    if (count) {
      return db.user.update({
        _id: req.user._id,
        'task._id': task_id
      }, {
        $set: {
          'task.$.is_assignee': true
        }
      })
    }
    return db.user.update({
      _id: req.user._id
    }, {
      $push: {
        task: {
          _id: task_id,
          company_id: req.company._id,
          project_id: req.project_id,
          is_creator: false,
          is_assignee: true
        }
      }
    })
  })
  .then(() => {
    return doUpdateField('assignee', req);
  })
  .then(() => res.json({}))
  .catch(next);
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
    res.json(result);
  })
  .catch(next);
});

api.post('/:task_id/followers', (req, res, next) => {
  if (!ObjectId.isValid(req.body._id)) {
    throw new ApiError(404);
  }
  let user_id = ObjectId(req.body._id);
  let task_id = ObjectId(req.params.task_id);
  isMemberOfCompany(user_id, req.project_id).then(() => {
    return db.task.update({
      _id: task_id
    }, {
      $addToSet: {
        followers: user_id
      }
    })
  })
  .then(result => {
    db.user.count({
      _id: user_id,
      'task._id': task_id
    })
    .then(count => {
      if (count) {
        return res.json(result);
      }
      db.user.update({
        _id: user_id
      }, {
        $push: {
          task: {
            _id: task_id,
            company_id: req.company._id,
            project_id: req.project_id,
            is_creator: false,
            is_assignee: false
          }
        }
      })
      .then(() => logTask(task_id, C.TASK_LOG_TYPE.FOLLOWERS, req.user._id))
      .then(() => {
        res.json(result);
      })
      .catch(next);
    })
  })
  .catch(next);
});

api.delete('/:task_id/followers/:follower_id', (req, res, next) => {
  let user_id = ObjectId(req.params.follower_id);
  let task_id = ObjectId(req.params.task_id);
  db.task.count({
    _id: task_id,
    $or: [{assignee: user_id}, {creator: user_id}]
  })
  .then(count => {
    if (count) {
      throw new ApiError(400, null, 'assignee and creator can not unfollow');
    }
    return db.task.update({
      _id: task_id
    }, {
      $pull: {
        followers: user_id
      }
    })
  })
  .then(doc => {
    return db.user.update({
      _id: user_id
    }, {
      $pull: {
        task: {
          _id: task_id
        }
      }
    })
  })
  .then(() => logTask(task_id, C.TASK_LOG_TYPE.FOLLOWERS, req.user._id))
  .then(() => res.json({}))
  .catch(next);
});

api.get('/:task_id/comment', (req, res, next) => {
  db.task.comments.find({
    task_id: ObjectId(req.params.task_id)
  })
  .then(data => {
    res.json(data || []);
  })
  .catch(next);
});

api.post('/:task_id/comment', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(commentSanitization, commentValidation, data);
  _.extend(data, {
    task_id: ObjectId(req.params.task_id),
    creator: req.user._id,
    likes: 0,
    date_create: new Date()
  });
  db.task.comments.insert(data)
  .then(data => {
    return db.task.update({
      _id: ObjectId(req.params.task_id)
    }, {
      $push: {
        comments: data._id
      }
    })
    .then(() => {
      res.json(data)
    })
    .catch(next);
  })
  .catch(next);
});

api.delete('/:task_id/comment/:comment_id', (req, res, next) => {
  let comment_id = ObjectId(req.params.comment_id);
  db.task.comments.remove({
    _id: comment_id
  })
  .then(() => {
    return db.task.update({
      _id: ObjectId(req.params.task_id)
    }, {
      $pull: {
        comments: comment_id
      }
    })
  })
  .then(() => res.json({}))
  .catch(next);
});

api.get('/:task_id/log', (req, res, next) => {
  db.task.log.find({
    task_id: ObjectId(req.params.task_id)
  })
  .then(data => {
    res.json(data || []);
  })
  .catch(next);
});

function updateField(field) {
  return (req, res, next) => {
    doUpdateField(field, req)
    .then((doc) => next())
    .catch(() => next('route'));
  }
}

function logTask(task_id, type, creator, content) {
  let data = {
    type: type,
    creator: creator,
    content: content || ''
  };
  sanitizeValidateObject(logSanitization, logValidation, data);
  _.extend(data, {
    task_id: task_id,
    date_create: new Date(),
  });
  return db.task.log.insert(data);
}

function doUpdateField(field, req) {
  let data = validField(field, req.body[field]);
  return db.task.update({
    _id: ObjectId(req.params.task_id)
  }, {
    $set: data
  });
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

function isMemberOfCompany(user_id, company_id) {
  return db.company.count({
    _id: company_id,
    'members._id': user_id
  })
  .then(count => {
    if (count == 0) {
      throw new ApiError(400, null, 'user is not one of the company member')
    }
  });
}
