import express from 'express';
import db from 'lib/database';
import C from 'lib/constants';

import { validate } from './schema';
import { oauthCheck } from 'lib/middleware';

let api = express.Router();
export default api;

api.get('/app', (req, res, next) => {
  validate('list', req.query);
  let { page, pagesize, type } = req.query;
  let sort;
  if (type == C.APP_LIST_TYPE.ALL) {
    sort = { _id: -1 };
  } else if (C.APP_LIST_TYPE.TOP) {
    sort = { star: -1 };
  } else {
    sort = { date_update: -1 };
  }
  db.app.find({}, {
    _id: 1,
    name: 1,
    appid: 1,
    icons: 1,
    version: 1,
    star: 1,
    description: 1,
    slideshow: 1,
    author: 1
  })
  .sort(sort)
  .skip((page - 1) * pagesize)
  .limit(pagesize)
  .then(list => {
    res.json(list);
  })
  .catch(next);
});

api.get('/app/:appid', (req, res, next) => {
  validate('appRequest', req.params, ['appid']);
  let { appid } = req.params;
  db.app.findOne({ appid: appid }, { metadata: 0 }).then(doc => {
    res.json(doc);
  })
  .catch(next);
});

api.get('/app/:appid/comment', oauthCheck(), (req, res, next) => {
  validate('appRequest', req.params, ['appid']);
  let { appid } = req.params;
  let user_id = req.user._id;
  db.app.comment.aggregate([
    { $match: {appid} },
    {
      $project: {
        appid: 1,
        app_version: 1,
        user_id: 1,
        star: 1,
        content: 1,
        total_likes: { $size: '$likes'},
        is_like: {
          $in: [user_id, '$likes']
        }
      }
    }
  ]).then(list => {
    res.json(list);
  })
  .catch(next);
});

api.put('/app/:appid/comment/:comment_id/like', oauthCheck(), (req, res, next) => {
  validate('appRequest', req.params, ['appid', 'comment_id']);
  let { appid, comment_id } = req.params;
  let user_id = req.user._id;
  db.app.comment.update({
    _id: comment_id
  }, {
    $push: {
      likes: user_id
    }
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.delete('/app/:appid/comment/:comment_id/like', oauthCheck(), (req, res, next) => {
  validate('appRequest', req.params, ['appid', 'comment_id']);
  let { appid, comment_id } = req.params;
  let user_id = req.user._id;
  db.app.comment.update({
    _id: comment_id
  }, {
    $pull: {
      likes: user_id
    }
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.post('/app/:appid/comment', oauthCheck(), (req, res, next) => {
  validate('appRequest', req.params, ['appid']);
  validate('appRequest', req.body, ['comment']);
  let { appid } = req.params;
  let user_id = req.user._id;
  let { star, content } = req.body;
  db.app.findOne({
    appid
  })
  .then(doc => {
    db.app.comment.insert({
      app_version: doc.version,
      user_id,
      user_avatar: req.user.avatar,
      user_name: req.user.name,
      appid,
      star,
      content,
      likes: [],
      date_create: new Date()
    }).then(doc => {
      res.json(doc);
      db.app.comment.count({appid}).then(counts => {
        db.app.findOne({appid}).then(app => {
          let score = app.star - (app.star - star)/counts;
          db.app.update({ appid }, { $set: { star: score }});
        });
      });
    });
  })
  .catch(next);
});
