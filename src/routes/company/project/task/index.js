import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';
import config from 'config';

import TaskLoop from 'models/task-loop';
import db from 'lib/database';
import { ApiError } from 'lib/error';
import C, { ENUMS } from 'lib/constants';
import { fetchCompanyMemberInfo, findObjectIdIndex, strToReg, fetchUserInfo, upload, saveCdn, mapObjectIdToData } from 'lib/utils';
import {
  TASK_ASSIGNED,
  TASK_UPDATE,
  TASK_REPLY,
} from 'models/notification-setting';
import { validate } from './schema';
import { attachFileUrls } from 'routes/company/document/index';
import CompanyLevel from 'models/company-level';

const api = express.Router();
export default api;

api.get('/', (req, res, next) => {
  let { keyword, sort, order, status, tag, assignee, creator, follower, page, pagesize, is_expired, is_loop, p_id } = req.query;
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
      $regex: strToReg(keyword, 'i')
    };
  }
  if (tag) {
    let tages = [];
    tag.split(',').forEach(item => {
      if (ObjectId.isValid(item)) {
        tages.push(ObjectId(item));
      }
    });
    condition['tags'] = { $all: tages };
  }
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
  if (p_id) {
    condition['p_id'] = ObjectId(p_id);
  }
  if (is_loop) {
    condition['$and'] = [{
      loop: {
        $exists: true
      },
      'loop.type': {
        $ne: null
      }
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
      // return fetchCompanyMemberInfo(req.company, data.list, 'assignee');
      return fetchUserInfo(data.list, 'assignee', 'followers');
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
  let fields = ['assignee', 'date_due', 'date_start', 'description', 'priority', 'title', 'tags', 'followers', 'attachments'];
  validate('task', data, fields);
  let followers;
  if (data.followers && _.isArray(data.followers)) {
    followers = data.followers;
  } else {
    followers = [req.user._id];
  }
  if (data.date_due && data.date_due <= data.date_start) {
    throw new ApiError(400, 'invalid_date');
  }
  _.extend(data, {
    creator: req.user._id,
    followers: followers,
    company_id: req.company._id,
    project_id: req.project._id,
    status: C.TASK_STATUS.PROCESSING,
    date_create: new Date(),
    date_update: new Date(),
    tags: data.tags || []
  });
  data.subtask = data.subtask ? data.subtask.map(subtask => initSubtask(subtask)) : [];
  return db.task.insert(data)
  .then(task => {
    res.json(task);
    req.task = task;
    let notification = {
      action: C.ACTIVITY_ACTION.ADD,
      target_type: C.OBJECT_TYPE.TASK_FOLLOWER,
      task: task._id,
      from: req.user._id,
      to: followers
    };
    req.model('notification').send(notification, TASK_UPDATE);
    return Promise.all([
      data.loop && TaskLoop.updateLoop(task),
      addActivity(req, C.ACTIVITY_ACTION.CREATE),
      data.assignee.equals(req.user._id) || sendNotification(req, C.ACTIVITY_ACTION.CHANGE_TASK_ASSIGNEE, {
        to: data.assignee
      }, TASK_ASSIGNED)
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
    // return fetchCompanyMemberInfo(req.company, task, 'creator', 'assignee', 'checker');
    return fetchUserInfo(task, 'creator', 'assignee', 'checker', 'followers');
  })
  .then(task => {
    return Promise.map(task.attachments, attachment => {
      return mapObjectIdToData(attachment, 'document.file', 'cdn_key,path,relpath,name,size,mimetype')
      .then(a => {
        if (a) {
          return attachFileUrls(req, a)
          .then(() => {
            return a;
          });
        } else {
          return {_id:attachment, deleted: true};
        }
      });
    })
    .then(task_attachment_list => {
      task.attachments = task_attachment_list;
      task.assignee.project_member = !!_.find(req.project.members, m => m._id.equals(task.assignee._id));
      res.json(task);
    });
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
  if (!req.user._id.equals(req.project.owner) && !req.user._id.equals(req.task.creator)) {
    throw new ApiError(400, 'only_project_owner_and_task_creator_can_delete_task');
  }
  db.task.remove({
    _id: req.task._id
  })
  .then(() => {
    res.json({});
    logTask(req, C.ACTIVITY_ACTION.DELETE);
    let notification = {
      action: C.ACTIVITY_ACTION.DELETE,
      target_type: C.OBJECT_TYPE.TASK,
      task: req.task._id,
      from: req.user._id,
      to: req.task.followers
    };
    req.model('notification').send(notification, TASK_UPDATE);
  })
  .catch(next);
});

api.put('/:task_id/title', updateField('title'));

api.put('/:task_id/description', updateField('description'));

api.put('/:task_id/priority', updateField('priority'));

api.put('/:task_id/date_start', updateField('date_start'));

api.put('/:task_id/date_due', updateField('date_due'));

api.put('/:task_id/attachments', updateAttachment());

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
    }, true);
  })
  .catch(next);
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
    addActivity(req, C.ACTIVITY_ACTION.ADD, {
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
    addActivity(req, C.ACTIVITY_ACTION.REMOVE, {
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
  if (!ObjectId.isValid(req.body._id) || !ObjectId.isValid(req.params.task_id)) {
    throw new ApiError(400);
  }
  let userId = ObjectId(req.body._id);
  let taskId = ObjectId(req.params.task_id);
  taskFollow(req, userId)
  .then(() => logTask(req, C.ACTIVITY_ACTION.ADD, {
    target_type: C.OBJECT_TYPE.TASK_FOLLOWER,
    user: userId,
  }))
  .then(() => {
    res.json({});
    let notification = {
      action: C.ACTIVITY_ACTION.ADD,
      target_type: C.OBJECT_TYPE.TASK_FOLLOWER,
      task: taskId,
      from: req.user._id,
      to: userId
    };
    req.model('notification').send(notification, TASK_UPDATE);
  })
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
    return fetchUserInfo(data, 'creator').then(() => {
      return Promise.map(data, comment => {
        return mapObjectIdToData(comment.attachments || [], 'document.file', 'cdn_key,path,relpath,name,size,mimetype').then(() => {
          return Promise.map(comment.attachments || [], attachment => {
            if (attachment == null) {
              attachment = {type: 'deleted'};
              return Promise.resolve(attachment);
            } else {
              return attachFileUrls(req, attachment);
            }
          });
        });
      }).then(() => {
        res.json(data || []);
      });
    });
  })
  .catch(next);
});

api.post('/:task_id/comment', (req, res, next) => {
  let data = req.body;
  validate('comment', data);
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
    .then(() => {
      fetchUserInfo(data, 'creator').then(() => {
        res.json(data);
      });
      sendNotification(req, C.ACTIVITY_ACTION.REPLY, {}, TASK_REPLY);
    });
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
  .then(() => {
    res.json({});
  })
  .catch(next);
});

api.get('/:task_id/activity', (req, res, next) => {
  let taskId = req.task._id;
  let { last_id } = req.query;
  req.model('activity').fetch({
    $or: [{
      task: taskId
    }, {
      'task._id': taskId
    }],
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
    $push: {subtask}
  })
  .then(() => {
    res.json(subtask);
    addActivity(req, C.ACTIVITY_ACTION.ADD, {
      target_type: C.OBJECT_TYPE.SUBTASK,
      field: {
        subtask: subtask.title
      }
    });
  })
  .catch(next);
});

api.delete('/:task_id/subtask/:subtask', (req, res, next) => {
  let subtask_id = ObjectId(req.params.subtask);
  let subtask = _.find(req.task.subtask, subtask => subtask._id.equals(subtask_id));
  if (!subtask) {
    throw new ApiError(404);
  }
  db.task.update({
    _id: req.task._id
  }, {
    $pull: {
      subtask: {
        _id: subtask_id
      }
    }
  })
  .then(doc => {
    res.json({});
    addActivity(req, C.ACTIVITY_ACTION.DELETE, {
      target_type: C.OBJECT_TYPE.SUBTASK,
      field: {
        subtask: subtask.title
      }
    });
  })
  .catch(next);
});

api.put('/:task_id/subtask/:subtask', (req, res, next) => {
  let subtask_id = ObjectId(req.params.subtask);
  let subtask = _.find(req.task.subtask, subtask => subtask._id.equals(subtask_id));
  if (!subtask) {
    throw new ApiError(404);
  }
  let update = {};
  let activityAction;
  let subtask1 = req.body;
  let subtask2 = _.clone(subtask1);
  if (subtask1.title) {
    validate('subtask', subtask1, ['title']);
    update['subtask.$.title'] = subtask1.title;
  }
  if (subtask2.status) {
    validate('subtask', subtask2, ['status']);
    update['subtask.$.status'] = subtask2.status;
    if (C.TASK_STATUS.COMPLETED == subtask2.status) {
      activityAction = C.ACTIVITY_ACTION.COMPLETE;
    } else {
      activityAction = C.ACTIVITY_ACTION.REOPEN;
    }
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
  .then(() => {
    res.json({});
    activityAction && addActivity(req, activityAction, {
      target_type: C.OBJECT_TYPE.SUBTASK,
      field: {
        subtask: subtask.title
      }
    });
  })
  .catch(next);
});

function updateAttachment() {
  return (req, res, next) => {
    validate('attachment', req.body);
    db.task.findOne({
      _id: req.task._id
    })
    .then(task => {
      db.task.findOneAndUpdate({
        _id: req.task._id
      }, {
        $set: {
          attachments: req.body.attachments
        }
      }, {
        returnOriginal: false,
        returnNewDocument: true,
      })
      .then(updated_task => {
        let new_task = updated_task.value;
        mapObjectIdToData(new_task.attachments || [], 'document.file', 'cdn_key,path,relpath,name,size,mimetype').then(() => {
          return Promise.map(new_task.attachments || [], attachment => {
            return attachFileUrls(req, attachment);
          });
        }).then(() => {
          res.json(new_task);
        });
        if (task.attachments && task.attachments.length) {
          if (req.body.attachments && !req.body.attachments.length) {
            mapObjectIdToData(task.attachments, 'document.file', 'name').then(list => {
              addActivity(req, C.ACTIVITY_ACTION.DELETE_ATTACHMENT, {attachment_list: list})
              .then(() => {
                Promise.map(task.attachments, item => {
                  return db.document.file.findOne({
                    _id: item
                  })
                  .then(doc =>{
                    if (doc && !doc.attachment_dir_file) {
                      return null;
                    } else {
                      db.task.findOne({
                        project_id: req.project._id,
                        attachments: item
                      },{
                        _id: 1,
                      })
                      .then(t => {
                        if (!t) {
                          doc && _deleteAttachmentFile(req, doc);
                        }
                      });
                    }
                  });
                });
              });
            });
          } else if (req.body.attachments && req.body.attachments.length) {
            let body_attachment_length = req.body.attachments.length;
            let task_attachment_length = task.attachments.length;
            let removed_file = [];
            for (let i = 0; i < task_attachment_length; i++) {
              let flag = false;
              for (let a = 0; a < body_attachment_length; a++) {
                if (task.attachments[i].equals(req.body.attachments[a])) {
                  flag = true;
                }
                if (a == body_attachment_length - 1) {
                  if (!flag) {
                    removed_file.push(task.attachments[i]);
                  }
                }
              }
            }
            let new_file = [];
            for (let i = 0; i < body_attachment_length; i++) {
              let flag = false;
              for (let a = 0; a < task_attachment_length; a++) {
                if (task.attachments[a].equals(req.body.attachments[i])) {
                  flag = true;
                }
                if (a == task_attachment_length - 1) {
                  if (!flag) {
                    new_file.push(req.body.attachments[i]);
                  }
                }
              }
            }
            if (new_file.length) {
              mapObjectIdToData(new_file, 'document.file', 'name').then(list => {
                addActivity(req, C.ACTIVITY_ACTION.ADD_ATTACHMENT, {attachment_list: list});
              });
            }
            if (removed_file.length) {
              mapObjectIdToData(removed_file, 'document.file', 'name').then(list => {
                addActivity(req, C.ACTIVITY_ACTION.DELETE_ATTACHMENT, {attachment_list: list})
                .then(() => {
                  Promise.map(removed_file, item => {
                    return db.document.file.findOne({
                      _id: item
                    })
                    .then(doc =>{
                      if (doc && !doc.attachment_dir_file) {
                        return null;
                      } else {
                        db.task.findOne({
                          project_id: req.project._id,
                          attachments: item
                        },{
                          _id: 1,
                        })
                        .then(t => {
                          if (!t) {
                            doc && _deleteAttachmentFile(req, doc);
                          }
                        });
                      }
                    });
                  });
                });
              });
            }
          }
        } else if (req.body.attachments && req.body.attachments.length) {
          mapObjectIdToData(req.body.attachments, 'document.file', 'name').then(list => {
            addActivity(req, C.ACTIVITY_ACTION.ADD_ATTACHMENT, {attachment_list: list});
          });
        }
      })
      .catch(next);
    });
  };
}

function _deleteAttachmentFile(req, file) {
  let incSize = 0;
  console.log(2, file);
  console.log(111, file, file.dir_id);
  db.document.dir.update({
    _id: file.dir_id,
  }, {
    $pull: {
      files: file._id
    }
  });
  db.document.file.remove({
    _id: file._id,
  })
  .then(() => {
    incSize -= file.size;
    req.model('document').deleteFile(req, file);
    let companyLevel = new CompanyLevel(req.company._id);
    return companyLevel.updateUpload({
      size: incSize,
      target_type: req.document.posKey == 'company_id' ? 'knowledge' : 'project',
      target_id: req.document.posVal,
    });
  });
}

function updateField(field) {
  return (req, res, next) => {
    doUpdateField(req, field)
    .then(data => res.json(data))
    .catch(() => next());
  };
}

function logTask(req, action, data) {
  return Promise.all([
    addActivity(req, action, data),
    sendNotification(req, action, data, TASK_UPDATE)
  ]);
}

function addActivity(req, action, data) {
  let info = {
    action: action,
    target_type: C.OBJECT_TYPE.TASK,
    task: req.task._id,
    ori_task: _.pick(req.task, '_id', 'title', 'company_id'),
    project: req.project._id,
    creator: req.user._id,
  };
  let activity = _.extend({}, info, data);
  return req.model('activity').insert(activity);
}

function sendNotification(req, action, data, type) {
  let info = {
    action: action,
    target_type: C.OBJECT_TYPE.TASK,
    task: req.task._id,
    ori_task: _.pick(req.task, '_id', 'title', 'company_id'),
    project: req.project._id,
    from: req.user._id,
    to: req.task.followers.filter(_id => !_id.equals(req.user._id)),
  };
  let notification = _.extend({}, info, data);
  return req.model('notification').send(notification, type);
}

function doUpdateField(req, field) {
  let data = validField(field, req.body[field]);
  if (data[field] == req.task[field]) {
    return Promise.resolve(data);
  }
  return db.task.update({
    _id: req.task._id
  }, {
    $set: data,
  })
  .then(() => {
    let action;
    let ext = {};
    if (field == 'title') {
      action = C.ACTIVITY_ACTION.RENAME;
      ext.field = {
        title: data[field]
      };
    } else if (field == 'assignee') {
      action = C.ACTIVITY_ACTION.CHANGE_TASK_ASSIGNEE;
      ext.project_member = data[field];
      data[field].equals(req.user._id) || sendNotification(req, action, _.extend({}, ext, {
        to: data[field]
      }), TASK_ASSIGNED);
    } else {
      action = C.ACTIVITY_ACTION.UPDATE;
      if (_.contains(['priority', 'date_start', 'date_due'], field)) {
        ext.update_fields = [[field, data[field]]];
      } else {
        ext.update_fields = [field];
      }
    }
    addActivity(req, action, ext);
    return data;
  });
}

function validField(field, val) {
  let data = {[field]: val};
  validate('task', data, field);
  return data;
}

function ensureProjectMember(project, user_id) {
  if (findObjectIdIndex(project.members.map(i => i._id), user_id) == -1) {
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
