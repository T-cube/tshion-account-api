import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';

import { ApiError } from 'lib/error';
import { sanitizeValidateObject } from 'lib/inspector';
import {
  sanitization,
  validation,
  commentSanitization,
  commentValidation,
  logSanitization,
  logValidation,
} from './schema';
import C, { ENUMS } from 'lib/constants';
import { oauthCheck } from 'lib/middleware';

let api = require('express').Router();
export default api;

api.use(oauthCheck());

api.use((req, res, next) => {
  next();
});

// TODO page
api.get('/', (req, res, next) => {
  let { keyword, sort, order, status, assignee, creator, follower} = req.query;
  let condition = {
    company_id: req.company._id,
    project_id: req.project_id,
  };
  let idItems = _.pick(req.query, 'assignee', 'creator', 'followers');
  if (!_.isEmpty(idItems)) {
    _.each(idItems, (ids, key) => {
      if (!ids) return;
      let idarr = ids.split(',').filter(id => ObjectId.isValid(id)).map(id => ObjectId(id));
      if (idarr.length) {
        if (key == 'follower') {
          condition[key] = { $elemMatch: { $in: idarr } };
        } else {
          condition[key] = { $in: idarr };
        }
      }
    });
    console.log(condition);
  }
  if (status) {
    status = status.split(',').filter(s => _.contains(ENUMS.TASK_STATUS, s));
    if (status.length) {
      condition['status'] = { $in: status };
    }
  }
  if (keyword) {
    condition['$text'] = { $search: keyword }
  }
  let sortBy = { status: -1, date_update: 1 };
  if (_.contains(['date_create','date_update','priority'], sort)) {
    order = order == 'desc' ? -1 : 1;
    sortBy = { [sort]: order }
  }
  db.task.find(condition).sort(sortBy)
  .then(list => {
    _.each(list, task => {
      task.is_following = !!_.find(task.followers, id => id.equals(req.user._id));
    });
    return res.json(list);
  })
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
    date_create: new Date(),
    date_update: new Date(),
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
    .then(() => logTask(doc._id, C.TASK_LOG_TYPE.CREATE, req.user._id))
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
    let userList = _.uniq([data.creator, data.assignee].concat(data.followers));
    db.user.find({
      _id: {
        $in: userList
      }
    }, {
      name: 1,
      avatar: 1
    })
    .then(doc => {
      let userIdMap = {};
      doc.forEach(i => userIdMap[i._id] = i);
      data.creator = userIdMap[data.creator];
      data.assignee = userIdMap[data.assignee];
      data.followers.forEach((j, k) => data.followers[k] = userIdMap[j]);
      res.json(data);
    })
    .catch(next);
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
      throw new ApiError(404, null, 'task not found');
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

api.put('/:task_id/priority', updateField('priority'), (req, res, next) => {
  logTask(ObjectId(req.params.task_id), C.TASK_LOG_TYPE.PRIORITY, req.user._id)
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
      throw new ApiError(400, null, 'member is already assignee of the task');
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

api.put('/:task_id/tag', (req, res, next) => {
  let data = validField('tags', req.body.tag);
  db.project.count({
    _id: req.project_id,
    'tags._id': data.tag
  })
  .then(count => {
    if (!count) {
      throw new ApiError(400, null, 'tag is not exists');
    }
    return db.task.update({
      _id: ObjectId(req.params.task_id)
    }, {
      $addToSet: data
    })
  })
  .then(result => res.json(result))
  .catch(next);
});

api.delete('/:task_id/tag/:tag_id', (req, res, next) => {
  db.task.update({
    _id: ObjectId(req.params.task_id)
  }, {
    $pull: {
      tags: ObjectId(req.params.tag_id)
    }
  })
  .then(result => res.json(result))
  .catch(next);
});

api.post('/:task_id/follow', (req, res, next) => {
  const taskId = ObjectId(req.params.task_id);
  const userId = req.user._id;
  taskFollow(req, taskId, userId)
  .then(() => logTask(taskId, C.TASK_LOG_TYPE.FOLLOW, req.user._id))
  .then(() => res.json({
    is_following: true,
  }))
  .catch(next);
});

api.post('/:task_id/unfollow', (req, res, next) => {
  const taskId = ObjectId(req.params.task_id);
  const userId = req.user._id;
  taskUnfollow(req, taskId, userId)
  .then(() => logTask(taskId, C.TASK_LOG_TYPE.UNFOLLOW, req.user._id))
  .then(() => res.json({
    is_following: false,
  }))
  .catch(next);
});

api.post('/:task_id/followers', (req, res, next) => {
  if (!ObjectId.isValid(req.body._id)) {
    throw new ApiError(400);
  }
  let userId = ObjectId(req.body._id);
  let taskId = ObjectId(req.params.task_id);
  taskFollow(req, taskId, userId)
  .then(() => logTask(taskId, C.TASK_LOG_TYPE.FOLLOWERS, req.user._id))
  .then(() => res.json({}))
  .catch(next);
});

api.delete('/:task_id/followers/:follower_id', (req, res, next) => {
  let userId = ObjectId(req.params.follower_id);
  let taskId = ObjectId(req.params.task_id);
  taskUnfollow(req, taskId, userId)
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
    content: content || ''
  };
  sanitizeValidateObject(logSanitization, logValidation, data);
  _.extend(data, {
    task_id: task_id,
    creator: creator,
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

function isMemberOfProject(userId, project_id) {
  return db.project.count({
    _id: project_id,
    'members._id': userId
  })
  .then(count => {
    if (count == 0) {
      throw new ApiError(400, null, 'user is not one of the project member')
    }
  });
}

function isMemberOfCompany(userId, company_id) {
  return db.company.count({
    _id: company_id,
    'members._id': userId
  })
  .then(count => {
    if (count == 0) {
      throw new ApiError(400, null, 'user is not one of the company member')
    }
  });
}

function taskFollow(req, taskId, userId) {
  return isMemberOfProject(userId, req.project_id)
  .then(() => {
    return db.task.update({
      _id: taskId
    }, {
      $addToSet: {
        followers: userId
      }
    });
  })
  .then(() => {
    db.user.count({
      _id: userId,
      'task._id': taskId,
    });
  })
  .then(count => {
    if (count) {
      return;
    }
    db.user.update({
      _id: userId
    }, {
      $push: {
        task: {
          _id: taskId,
          company_id: req.company._id,
          project_id: req.project_id,
          is_creator: false,
          is_assignee: false
        }
      }
    });
  });
}

function taskUnfollow(req, taskId, userId) {
  return db.task.count({
    _id: taskId,
    $or: [{assignee: userId}, {creator: userId}],
  })
  .then(count => {
    if (count) {
      throw new ApiError(400, null, 'assignee and creator can not unfollow');
    }
    return db.task.update({
      _id: taskId
    }, {
      $pull: {
        followers: userId
      }
    })
  })
  .then(() => {
    return db.user.update({
      _id: userId
    }, {
      $pull: {
        task: {
          _id: taskId
        }
      }
    })
  });
}
