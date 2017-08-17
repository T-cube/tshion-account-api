import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';

import C from 'lib/constants';
import db from 'lib/database';
import { ApiError } from 'lib/error';
import { fetchCompanyMemberInfo } from 'lib/utils';
import {
  PROJECT_DISCUSSION
} from 'models/notification-setting';
import { validate } from './schema';

const api = express.Router();
export default api;

api.get('/', (req, res, next) => {
  let { type } = req.query;
  let condition = {
    project_id: req.project._id
  };
  if (type == 'creator') {
    condition.creator = req.user._id;
  }
  if (type == 'follower') {
    condition.followers = req.user._id;
  }
  db.discussion.find(condition).sort({_id: -1})
  .then(doc => {
    return fetchCompanyMemberInfo(req.company, doc, 'followers', 'creator').then(
      () => res.json(doc)
    );
  })
  .catch(next);
});

api.get('/count', (req, res, next) => {
  let count = {};
  Promise.all([
    db.discussion.count({
      project_id: req.project._id,
      creator: req.user._id
    })
    .then(createCount => count.create = createCount),
    db.discussion.count({
      project_id: req.project._id,
      followers: req.user._id
    })
    .then(followCount => count.follow = followCount),
  ])
  .then(() => res.json(count))
  .catch(next);
});

api.post('/', (req, res, next) => {
  let data = req.body;
  let project_id = req.project._id;
  validate('discussion', data);
  _.extend(data, {
    project_id: project_id,
    creator: req.user._id,
    followers: [req.user._id],
    date_create: new Date(),
    date_update: new Date(),
  });
  req.model('html-helper').sanitize(data.content)
  .then(content => {
    data.content = content;
    return db.discussion.insert(data);
  })
  .then(doc => {
    doc.creator = _.pick(req.user, '_id', 'name', 'avatar');
    res.json(doc);
    req.project_discussion = req.project_discussion = _.pick(doc, '_id', 'title');
    logProject(req, C.ACTIVITY_ACTION.CREATE);
  })
  .catch(next);
});

api.put('/:discussion_id', (req, res, next) => {
  let data = req.body;
  let discussion_id = ObjectId(req.params.discussion_id);
  validate('discussion', data);
  data.date_update = new Date();
  req.model('html-helper').sanitize(data.content)
  .then(content => {
    data.content = content;
  })
  .then(() => {
    return db.discussion.findAndModify({
      query: {
        _id: discussion_id,
        creator: req.user._id
      },
      update: {
        $set: data
      }
    });
  })
  .then(doc => {
    let discussion = doc.value;
    if (!discussion) {
      throw new ApiError(400, 'update_failed');
    }
    res.json({});
    req.project_discussion = _.pick(discussion, '_id', 'title');
    req.project_discussion_followers = discussion.followers;
    if (doc.value.title != data.title) {
      req.project_discussion.new_title = data.title;
    }
    logProject(req, C.ACTIVITY_ACTION.UPDATE);
  })
  .catch(next);
});

api.get('/:discussion_id', (req, res, next) => {
  let project_id = req.project._id;
  let discussion_id = ObjectId(req.params.discussion_id);
  db.discussion.findOne({
    _id: discussion_id,
    project_id: project_id,
  })
  .then(doc => {
    if (!doc) {
      throw new ApiError(404);
    }
    return req.model('html-helper').prepare(doc.content)
    .then(content => {
      doc.content = content;
      return fetchCompanyMemberInfo(req.company, doc, 'followers', 'creator');
    });
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.delete('/:discussion_id', (req, res, next) => {
  let project_id = req.project._id;
  let discussion_id = ObjectId(req.params.discussion_id);
  db.discussion.findOne({
    _id: discussion_id
  }, {
    title: 1,
    followers: 1,
  })
  .then(discussion => {
    return db.discussion.remove({
      _id: discussion_id,
      project_id: project_id,
    })
    .then(doc => {
      res.json({});
      if (doc.ok) {
        req.project_discussion_followers = discussion.followers;
        req.project_discussion = req.project_discussion = _.pick(discussion, '_id', 'title');
        logProject(req, C.ACTIVITY_ACTION.DELETE);
      }
    });
  })
  .catch(next);
});

api.post('/:discussion_id/follow', (req, res, next) => {
  let data = req.body;
  let project_id = req.project._id;
  let discussion_id = ObjectId(req.params.discussion_id);
  validate('follow', data);
  db.discussion.update({
    _id: discussion_id,
    project_id: project_id,
  }, {
    $addToSet: {
      followers: data._id
    }
  })
  .then(doc => {
    res.json(doc);
    let follower = ObjectId(data._id);
    let notification = {
      action: C.ACTIVITY_ACTION.ADD,
      target_type: C.OBJECT_TYPE.DISCUSSION_FOLLOWER,
      discussion: discussion_id,
      project: project_id,
      from: req.user._id,
      to: follower
    };
    req.model('notification').send(notification, PROJECT_DISCUSSION);
  })
  .catch(next);
});

api.delete('/:discussion_id/follow/:follower_id', (req, res, next) => {
  let project_id = req.project._id;
  let discussion_id = ObjectId(req.params.discussion_id);
  let follower_id = ObjectId(req.params.follower_id);
  db.discussion.update({
    _id: discussion_id,
    project_id: project_id,
  }, {
    $pull: {
      followers: follower_id
    }
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.post('/:discussion_id/comment', (req, res, next) => {
  let project_id = req.project._id;
  let discussion_id = ObjectId(req.params.discussion_id);
  let data = req.body;
  validate('comment', data);
  _.extend(data, {
    discussion_id: discussion_id,
    creator: req.user._id,
    date_create: new Date(),
  });
  db.discussion.findOne({
    _id: discussion_id
  }, {
    title: 1,
    followers: 1,
  })
  .then(discussion => {
    if (!discussion) {
      throw new ApiError(404);
    }
    return db.discussion.comment.insert(data)
    .then(doc => {
      doc.creator = _.pick(req.user, '_id', 'avatar');
      doc.creator.name = _.find(req.company.members, m => m._id.equals(req.user._id)).name;
      res.json(doc);
      return db.discussion.update({
        _id: discussion_id,
        project_id: project_id,
      }, {
        $push: {
          comments: doc._id
        }
      });
    })
    .then(() => {
      req.project_discussion = _.pick(discussion, '_id', 'title');
      req.project_discussion_followers = discussion.followers;
      logProject(req, C.ACTIVITY_ACTION.REPLY);
    });
  })
  .catch(next);
});

api.get('/:discussion_id/comment', (req, res, next) => {
  let project_id = req.project._id;
  let discussion_id = ObjectId(req.params.discussion_id);
  db.discussion.findOne({
    _id: discussion_id,
    project_id: project_id,
  }, {
    comments: 1
  })
  .then(discussion => {
    if (!discussion) {
      throw new ApiError(404);
    }
    if (!discussion.comments || !discussion.comments.length) {
      return [];
    }
    return db.discussion.comment.find({
      _id: {
        $in: discussion.comments
      }
    });
  })
  .then(doc => fetchCompanyMemberInfo(req.company, doc, 'creator'))
  .then(doc => res.json(doc))
  .catch(next);
});

api.delete('/:discussion_id/comment/:comment_id', (req, res, next) =>  {
  let project_id = req.project._id;
  let discussion_id = ObjectId(req.params.discussion_id);
  let comment_id = ObjectId(req.params.comment_id);
  db.discussion.count({
    _id: discussion_id,
    project_id: project_id,
  })
  .then(count => {
    if (!count) {
      throw new ApiError(404);
    }
    return db.discussion.comment.remove({
      _id: comment_id,
      discussion_id: discussion_id,
    });
  })
  .then(() => res.json({}))
  .catch(next);
});

function logProject(req, action, data) {
  let info = {
    action: action,
    target_type: C.OBJECT_TYPE.PROJECT_DISCUSSION,
    project: req.project._id,
    project_discussion: req.project_discussion,
  };
  info.project_discussion.company_id = req.company._id;
  info = _.extend(info, data);
  let activity = _.extend({}, info, {
    creator: req.user._id,
  });
  req.model('activity').insert(activity);
  if (req.project_discussion_followers) {
    let notification = _.extend({}, info, {
      from: req.user._id,
      to: req.project_discussion_followers.filter(follower => !follower.equals(req.user._id))
    });
    req.model('notification').send(notification, PROJECT_DISCUSSION);
  }
}
