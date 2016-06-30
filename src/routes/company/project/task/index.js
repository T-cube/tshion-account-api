import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import config from 'config';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import { sanitizeValidateObject } from 'lib/inspector';
import C, { ENUMS } from 'lib/constants';
import { fetchCompanyMemberInfo, indexObjectId } from 'lib/utils';
import {
  sanitization,
  validation,
  commentSanitization,
  commentValidation,
} from './schema';

let api = express.Router();
export default api;

api.get('/', (req, res, next) => {
  let { keyword, sort, order, status, tag, assignee, creator, follower, page, pagesize } = req.query;
  page = parseInt(page) || 1;
  pagesize = parseInt(pagesize);
  pagesize = (pagesize <= config.get('view.maxListNum') && pagesize > 0) ? pagesize : config.get('view.taskListNum');
  let condition = {
    project_id: req.project._id,
  };
  let idItems = _.pick(req.query, 'assignee', 'creator', 'followers');
  if (!_.isEmpty(idItems)) {
    _.each(idItems, (ids, key) => {
      if (!ids) return;
      let idarr = ids.split(',').filter(id => ObjectId.isValid(id)).map(id => ObjectId(id));
      if (idarr.length) {
        if (key == 'followers') {
          condition[key] = { $elemMatch: { $in: idarr } };
        } else if (idarr.length > 1) {
          condition[key] = { $in: idarr };
        } else {
          condition[key] = idarr[0];
        }
      }
    });
  }
  if (status) {
    status = status.split(',').filter(s => _.contains(ENUMS.TASK_STATUS, s));
    if (status.length) {
      condition['status'] = { $in: status };
    }
  }
  if (keyword) {
    condition['$text'] = { $search: keyword };
  }
  if (tag && ObjectId.isValid(tag)) {
    condition['tags'] = ObjectId(tag);
  }
  let sortBy = { status: -1, date_update: 1 };
  if (_.contains(['date_create', 'date_update', 'priority'], sort)) {
    order = order == 'desc' ? -1 : 1;
    sortBy = { [sort]: order };
  }
  let data = {};
  Promise.all([
    db.task.count(condition)
    .then(sum => {
      data.totalrows = sum;
      data.page = page;
      data.pagesize = pagesize;
    }),
    db.task.find(condition)
    .sort(sortBy)
    .skip((page - 1) * pagesize)
    .limit(pagesize)
    .then(list => {
      _.each(list, task => {
        task.is_following = !!_.find(task.followers, user_id => user_id.equals(req.user._id));
        task.tags = task.tags.map(_id => _.find(req.project.tags, tag => tag._id.equals(_id)));
      });
      data.list = list;
      return fetchCompanyMemberInfo(req.company.members, data.list, 'assignee');
    })
  ])
  .then(() => res.json(data))
  .catch(next);
});

api.post('/', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(sanitization, validation, data);
  if (data.date_due < data.date_start) {
    throw new ApiError(400, null, 'wrong date');
  }
  _.extend(data, {
    creator: req.user._id,
    followers: [req.user._id],
    company_id: req.company._id,
    project_id: req.project._id,
    date_create: new Date(),
    date_update: new Date(),
    subtask: []
  });
  return db.task.insert(data)
  .then(doc => {
    req.task = doc;
    res.json(doc);
    return logTask(req, C.ACTIVITY_ACTION.CREATE);
  })
  .catch(next);
});

api.get('/:_task_id', (req, res, next) => {
  db.task.findOne({
    _id: ObjectId(req.params._task_id),
    project_id: req.project._id,
  })
  .then(data => {
    if (!data) {
      throw new ApiError(404, null, 'task not found!');
    }
    return fetchCompanyMemberInfo(req.company.members, data, 'creator', 'assignee', 'followers')
    .then(() => res.json(data));
  })
  .catch(next);
});

api.param('task_id', (req, res, next, id) => {
  let taskId = ObjectId(id);
  db.task.findOne({
    _id: taskId,
    project_id: req.project._id,
  })
  .then(task => {
    if (!task) {
      throw new ApiError(404, null, 'task not found');
    }
    req.task = task;
    next();
  })
  .catch(next);
});

api.delete('/:task_id', (req, res, next) => {
  db.task.remove({
    _id: req.task._id
  })
  .then(() => {
    res.json({});
    return logTask(req, C.ACTIVITY_ACTION.DELETE);
  })
  .catch(next);
});

api.put('/:task_id/status', updateField('status'));

api.put('/:task_id/title', updateField('title'));

api.put('/:task_id/description', updateField('description'));

api.put('/:task_id/priority', updateField('priority'));

api.put('/:task_id/date_start', updateField('date_start'));

api.put('/:task_id/date_due', updateField('date_due'));

api.put('/:task_id/assignee', (req, res, next) => {
  let data = validField('assignee', req.body.assignee);
  ensureProjectMember(req.project, data.assignee);
  doUpdateField(req, 'assignee')
  .then(() => {
    res.json({});
    return taskFollow(req, data.assignee);
  })
  .catch(next);
});

api.put('/:task_id/tag', (req, res, next) => {
  let data = {
    tags: req.body.tag
  };
  sanitizeValidateObject({
    tags: { $objectId: 1 }
  }, {
    tags: { $objectId: 1 }
  }, data);
  db.project.count({
    _id: req.project._id,
    'tags._id': data.tags
  })
  .then(count => {
    if (!count) {
      throw new ApiError(400, null, 'tag is not exists');
    }
    return db.task.update({
      _id: req.task._id
    }, {
      $addToSet: data
    });
  })
  .then(result => res.json(result))
  .catch(next);
});

api.delete('/:task_id/tag/:tag_id', (req, res, next) => {
  db.task.update({
    _id: req.task._id
  }, {
    $pull: {
      tags: ObjectId(req.params.tag_id)
    }
  })
  .then(result => res.json(result))
  .catch(next);
});

api.post('/:task_id/follow', (req, res, next) => {
  taskFollow(req)
  .then(() => logTask(req, C.ACTIVITY_ACTION.FOLLOW))
  .then(() => res.json({
    is_following: true,
  }))
  .catch(next);
});

api.post('/:task_id/unfollow', (req, res, next) => {
  taskUnfollow(req)
  .then(() => logTask(req, C.ACTIVITY_ACTION.UNFOLLOW))
  .then(() => res.json({
    is_following: false,
  }))
  .catch(next);
});

api.put('/:task_id/followers', (req, res, next) => {
  if (!ObjectId.isValid(req.body._id)) {
    throw new ApiError(400);
  }
  let userId = ObjectId(req.body._id);
  taskFollow(req, userId)
  .then(() => logTask(req, C.ACTIVITY_ACTION.ADD, {
    target_type: C.OBJECT_TYPE.TASK_FOLLOWER,
    user: userId,
  }))
  .then(() => res.json({}))
  .catch(next);
});

api.delete('/:task_id/followers/:follower_id', (req, res, next) => {
  let userId = ObjectId(req.params.follower_id);
  taskUnfollow(req, userId)
  .then(() => logTask(req, C.ACTIVITY_ACTION.REMOVE, {
    target_type: C.OBJECT_TYPE.TASK_FOLLOWER,
    user: userId,
  }))
  .then(() => res.json({}))
  .catch(next);
});

api.get('/:task_id/comment', (req, res, next) => {
  db.task.comments.find({
    task_id: req.task._id
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
    task_id: req.task._id,
    creator: req.user._id,
    likes: 0,
    date_create: new Date()
  });
  db.task.comments.insert(data)
  .then(data => {
    return db.task.update({
      _id: req.task._id
    }, {
      $push: {
        comments: data._id
      }
    })
    .then(() => res.json(data));
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
      _id: req.task._id
    }, {
      $pull: {
        comments: comment_id
      }
    });
  })
  .then(() => res.json({}))
  .catch(next);
});

api.get('/:task_id/activity', (req, res, next) => {
  let taskId = req.task._id;
  let { last_id } = req.query;
  req.model('activity').fetch({
    task: taskId,
  }, last_id)
  .then(list => res.json(list))
  .catch(next);
});

function updateField(field) {
  return (req, res, next) => {
    doUpdateField(req, field)
    .then(data => res.json(data))
    .catch(() => next());
  };
}

function logTask(req, action, data) {
  let info = {
    action: action,
    target_type: C.OBJECT_TYPE.TASK,
    task: req.task._id,
    project: req.project._id,
  };
  let activity = _.extend({
    creator: req.user._id,
  }, info, data);
  let notification = _.extend({
    from: req.user._id,
    to: req.task.followers.filter(_id => !_id.equals(req.user._id)),
  }, info, data);
  req.model('activity').insert(activity);
  req.model('notification').send(notification);
}

function doUpdateField(req, field) {
  let data = validField(field, req.body[field]);
  return db.task.update({
    _id: req.task._id
  }, {
    $set: data,
  })
  .then(() => {
    if (data.status) {
      if (data.status == C.TASK_STATUS.COMPLETED) {
        return logTask(req, C.ACTIVITY_ACTION.COMPLETE);
      } else if (data.status == C.TASK_STATUS.PROCESSING) {
        return logTask(req, C.ACTIVITY_ACTION.REOPEN);
      }
    }
    return logTask(req, C.ACTIVITY_ACTION.UPDATE, {field: data});
  })
  .then(() => data);
}

function validField(field, val) {
  let data = {[field]: val};
  let fieldSanitization = _.pick(sanitization, field);
  let fieldValidation = _.pick(validation, field);
  fieldSanitization[field].optional = false;
  fieldValidation[field].optional = false;
  sanitizeValidateObject(fieldSanitization, fieldValidation, data);
  return data;
}

function ensureProjectMember(project, user_id) {
  if (indexObjectId(project.members.map(i => i._id), user_id) == -1) {
    throw new ApiError(400, null, 'not the member of this project');
  }
}

function taskFollow(req, userId) {
  const taskId = req.task._id;
  userId = userId || req.user._id;
  ensureProjectMember(req.project, userId);
  return db.task.update({
    _id: taskId
  }, {
    $addToSet: {
      followers: userId
    }
  });
}

function taskUnfollow(req, userId) {
  const taskId = req.task._id;
  userId = userId || req.user._id;
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
    });
  });
}
