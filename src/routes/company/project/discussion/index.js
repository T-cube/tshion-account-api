import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import { sanitizeValidateObject } from 'lib/inspector';
import {
  discussionSanitization,
  discussionValidation,
  commentSanitization,
  commentValidation,
  followSanitization,
  followValidation,
} from './schema';
import { oauthCheck, authCheck } from 'lib/middleware';
import { fetchUserInfo } from 'lib/utils';

let api = require('express').Router();
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
    return fetchUserInfo(doc, 'followers').then(
      () => res.json(doc)
    );
  })
  .catch(next);
});

api.post('/', (req, res, next) => {
  let data = req.body;
  let project_id = req.project._id;
  sanitizeValidateObject(discussionSanitization, discussionValidation, data);
  _.extend(data, {
    project_id: project_id,
    creator: req.user._id,
    followers: [req.user._id],
    date_create: new Date(),
  });
  db.discussion.insert(data)
  .then(doc => res.json(doc))
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
    return fetchUserInfo(doc, 'followers').then(
      () => res.json(doc)
    );
  })
  .catch(next);
});

api.delete('/:discussion_id', (req, res, next) => {
  let project_id = req.project._id;
  let discussion_id = ObjectId(req.params.discussion_id);
  db.discussion.remove({
    _id: discussion_id,
    project_id: project_id,
  })
  .then(() => res.json({}))
  .catch(next);
});

api.post('/:discussion_id/follow', (req, res, next) => {
  let data = req.body;
  let project_id = req.project._id;
  let discussion_id = ObjectId(req.params.discussion_id);
  sanitizeValidateObject(followSanitization, followValidation, data);
  db.discussion.update({
    _id: discussion_id,
    project_id: project_id,
  }, {
    $addToSet: {
      followers: data._id
    }
  })
  .then(doc => res.json(doc))
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
  sanitizeValidateObject(commentSanitization, commentValidation, data);
  db.discussion.comment.insert(data)
  .then(doc => {
    res.json(doc);
    return db.discussion.update({
      _id: discussion_id,
      project_id: project_id,
    }, {
      $push: {
        comments: doc._id
      }
    })
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
      return res.json([]);
    }
    return db.discussion.comment.find({
      _id: {
        $in: discussion.comments
      }
    })
    
    .then(doc => res.json(doc))
  })
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
    return db.discussion.comment.find({
      _id: comment_id,
      discussion_id: discussion_id,
    })
    
    .then(() => res.json({}))
  })
  .catch(next);
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
