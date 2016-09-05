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
import { fetchCompanyMemberInfo } from 'lib/utils';

let api = express.Router();
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
  sanitizeValidateObject(discussionSanitization, discussionValidation, data);
  _.extend(data, {
    project_id: project_id,
    creator: req.user._id,
    followers: [req.user._id],
    date_create: new Date(),
  });
  req.model('html-helper').sanitize(data.content)
  .then(content => {
    data.content = content;
    return db.discussion.insert(data);
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.put('/:discussion_id', (req, res, next) => {
  let data = req.body;
  let discussion_id = ObjectId(req.params.discussion_id);
  sanitizeValidateObject(discussionSanitization, discussionValidation, data);
  req.model('html-helper').sanitize(data.content)
  .then(content => {
    data.content = content;
  })
  .then(() => {
    return db.discussion.update({
      _id: discussion_id,
      creator: req.user._id
    }, {
      $set: data
    });
  })
  .then(doc => {
    if (!doc.ok) {
      throw new ApiError(400, 'update_failed');
    }
    res.json({});
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
  _.extend(data, {
    discussion_id: discussion_id,
    creator: req.user._id,
    date_create: new Date(),
  });
  db.discussion.comment.insert(data)
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
