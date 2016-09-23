import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';
import config from 'config';

import TaskLoop from 'models/task-loop';
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
  validate,
} from './schema';

let api = express.Router();
export default api;

api.get('/', (req, res, next) => {
  let { keyword, sort, order, status, tag, assignee, creator, follower, page, pagesize, is_expired } = req.query;
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
    // condition['$text'] = { $search: keyword };
    condition['title'] = {
      $regex: RegExp(keyword, 'i')
    };
  }
  if (tag && ObjectId.isValid(tag)) {
    condition['tags'] = ObjectId(tag);
  }
  is_expired += '';
  if (is_expired === '1') {
    condition['status'] = C.TASK_STATUS.PROCESSING;
    condition['date_due'] = {
      $lt: new Date()
    };
  } else if (is_expired === '0') {
    condition['$or'] = [{
      date_due: {
        $gte: new Date()
      }
    }, {
      status: C.TASK_STATUS.COMPLETED
    }];
  }
  let sortBy = { status: -1, date_update: -1 };
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
        // task.tags = task.tags && task.tags.map(_id => _.find(req.project.tags, tag => tag._id.equals(_id)));
      });
      data.list = list;
      return fetchCompanyMemberInfo(req.company, data.list, 'assignee');
    })
    .then(() => {
      data.list.forEach(task => task.assignee.project_member = !!_.find(req.project.members, m => m._id.equals(task.assignee._id)));
    })
  ])
  .then(() => res.json(data))
  .catch(next);
});

api.post('/', (req, res, next) => {
  let data = req.body;
  let fields = ['assignee', 'date_due', 'date_start', 'description', 'priority', 'title'];
  sanitizeValidateObject(_.pick(sanitization, ...fields), _.pick(validation, ...fields), data);
  if (data.date_due < data.date_start) {
    throw new ApiError(400, 'invalid_date');
  }
  _.extend(data, {
    creator: req.user._id,
    followers: [req.user._id],
    company_id: req.company._id,
    project_id: req.project._id,
    status: C.TASK_STATUS.PROCESSING,
    date_create: new Date(),
    date_update: new Date(),
  });
  data.subtask = data.subtask ? data.subtask.map(subtask => initSubtask(subtask)) : [];
  return db.task.insert(data)
  .then(task => {
    res.json(task);
    req.task = task;
    return Promise.all([
      data && TaskLoop.updateLoop(task),
      logTask(req, C.ACTIVITY_ACTION.CREATE)
    ]);
  })
  .catch(next);
});

api.get('/:_task_id', (req, res, next) => {
  db.task.findOne({
    _id: ObjectId(req.params._task_id),
    project_id: req.project._id,
  })
  .then(task => {
    if (!task) {
      throw new ApiError(404);
    }
    // task.tags = task.tags && task.tags.map(_id => _.find(req.project.tags, tag => tag._id.equals(_id)));
    return fetchCompanyMemberInfo(req.company, task, 'creator', 'assignee', 'checker');
  })
  .then(task => {
    task.assignee.project_member = !!_.find(req.project.members, m => m._id.equals(task.assignee._id));
    res.json(task);
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
      throw new ApiError(404);
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

api.put('/:task_id/title', updateField('title'));

api.put('/:task_id/description', updateField('description'));

api.put('/:task_id/priority', updateField('priority'));

api.put('/:task_id/date_start', updateField('date_start'));

api.put('/:task_id/date_due', updateField('date_due'));

api.put('/:task_id/checker', (req, res, next) => {
  let checker = req.body.checker;
  if (checker && ObjectId.isValid(checker)) {
    checker = ObjectId(checker);
    ensureProjectMember(req.project, checker);
  }
  next();
}, updateField('checker'));

api.put('/:task_id/loop', (req, res, next) => {
  return doUpdateField(req, 'loop')
  .then(data => {
    res.json(data);
    return TaskLoop.updateLoop({
      _id: req.task._id,
      loop: data.loop
    });
  })
  .catch(next);
  // let data = validField('loop', req.body['loop']);
  // let nextLoop = TaskLoop.getTaskNext(data);
  // nextLoop && (data.loop.next = nextLoop);
  // if (data.loop && data.loop.end && data.loop.end.type == 'times') {
  //   data.loop.end.times_already = 1;
  // }
  // return db.task.update({
  //   _id: req.task._id
  // }, {
  //   $set: data,
  // })
  // .then(() => {
  //   res.json(data);
  //   logTask(req, C.ACTIVITY_ACTION.UPDATE, {field: {
  //     loop: {
  //       type: data.loop.type
  //     }
  //   }});
  // })
  // .catch(next);
});

api.put('/:task_id/status', (req, res, next) => {
  let data = validField('status', req.body.status);
  if (req.task.checker && !req.task.checker.equals(req.user._id) && data.status == C.TASK_STATUS.COMPLETED) {
    data.status = C.TASK_STATUS.CHECKING;
  }
  return db.task.update({
    _id: req.task._id
  }, {
    $set: data,
  })
  .then(() => {
    res.json(data);
    switch (data.status) {
    case C.TASK_STATUS.COMPLETED:
      logTask(req, C.ACTIVITY_ACTION.COMPLETE);
      break;
    case C.TASK_STATUS.PROCESSING:
      logTask(req, C.ACTIVITY_ACTION.REOPEN);
      break;
    case C.TASK_STATUS.CHECKING:
      logTask(req, C.ACTIVITY_ACTION.REOPEN); // TODO
      break;
    }
  })
  .catch(next);
});

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
  let tagId = ObjectId(req.body.tag);
  db.project.count({
    _id: req.project._id,
    'tags._id': tagId
  })
  .then(count => {
    if (!count) {
      throw new ApiError(400, 'tag_not_exists');
    }
    return db.task.update({
      _id: req.task._id
    }, {
      $addToSet: {
        tags: tagId,
      }
    });
  })
  .then(() => {
    let tagItem = _.find(req.project.tags, tag => tag._id.equals(tagId));
    logTask(req, C.ACTIVITY_ACTION.ADD, {
      target_type: C.OBJECT_TYPE.TASK_TAG,
      tag: tagItem,
    });
  })
  .then(() => res.json({}))
  .catch(next);
});

api.delete('/:task_id/tag/:tag_id', (req, res, next) => {
  let tagId = ObjectId(req.params.tag_id);
  db.task.update({
    _id: req.task._id
  }, {
    $pull: {
      tags: tagId,
    }
  })
  .then(() => {
    let tagItem = _.find(req.project.tags, tag => tag._id.equals(tagId));
    logTask(req, C.ACTIVITY_ACTION.REMOVE, {
      target_type: C.OBJECT_TYPE.TASK_TAG,
      tag: tagItem,
    });
  })
  .then(() => res.json({}))
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

api.post('/:task_id/subtask', (req, res, next) => {
  let subtask = req.body;
  validate('subtask', subtask, ['title']);
  subtask = initSubtask(subtask.title);
  db.task.update({
    _id: req.task._id
  }, {
    $push: {
      subtask: subtask
    }
  })
  .then(doc => res.json(subtask))
  .catch(next);
});

api.delete('/:task_id/subtask/:subtask', (req, res, next) => {
  let subtask_id = ObjectId(req.params.subtask);
  db.task.update({
    _id: req.task._id
  }, {
    $pull: {
      subtask: {
        _id: subtask_id
      }
    }
  })
  .then(doc => res.json({}))
  .catch(next);
});

api.put('/:task_id/subtask/:subtask', (req, res, next) => {
  let subtask_id = ObjectId(req.params.subtask);
  let update = {};
  let subtask1 = req.body;
  let subtask2 = _.clone(subtask1);
  if (subtask1.title) {
    validate('subtask', subtask1, ['title']);
    update['subtask.$.title'] = subtask1.title;
  }
  if (subtask2.status) {
    validate('subtask', subtask2, ['status']);
    update['subtask.$.status'] = subtask2.status;
  }
  if (_.isEmpty(update)) {
    throw new ApiError(400, 'update_failed');
  }
  update['subtask.$.date_update'] = new Date();
  db.task.update({
    _id: req.task._id,
    'subtask._id': subtask_id
  }, {
    $set: update
  })
  .then(doc => res.json({}))
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
    logTask(req, C.ACTIVITY_ACTION.UPDATE, {field: data});
    return data;
  });
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
    throw new ApiError(400, 'member_not_exists');
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
      throw new ApiError(400, 'assignee_and_creator_can_not_unfollow');
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

function initSubtask(subtask) {
  return {
    _id: ObjectId(),
    title: subtask,
    status: C.TASK_STATUS.PROCESSING,
    date_create: new Date(),
    date_update: new Date(),
  };
}
