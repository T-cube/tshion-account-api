import express from 'express';
import db from 'lib/database';
import C from 'lib/constants';
import _ from 'underscore';
import Promise from 'bluebird';

import { ApiError } from 'lib/error';
import { upload, saveCdn } from 'lib/upload';
import { validate } from './schema';
import { oauthCheck } from 'lib/middleware';
import { mapObjectIdToData } from 'lib/utils';
import { attachFileUrls } from 'routes/company/document/index';

let api = express.Router();
export default api;

api.get('/app', (req, res, next) => {
  validate('list', req.query);
  let { page, pagesize, type } = req.query;
  let sort;
  if (type == C.APP_LIST_TYPE.ALL) {
    sort = { _id: -1 };
  } else if (C.APP_LIST_TYPE.TOP) {
    sort = { rate: -1 };
  } else {
    sort = { date_update: -1 };
  }
  db.app.find({
    status: 'enabled'
  }, {
    permissions: 0,
    dependencies: 0,
    storage: 0,
    slideshow: 0,
  })
  .sort(sort)
  .skip((page - 1) * pagesize)
  .limit(pagesize)
  .then(list => {
    res.json(list);
  })
  .catch(next);
});

api.get('/store/index', oauthCheck(), (req, res, next) => {
  Promise.all([
    db.app.slideshow.find({status: 'active'}).sort({_id: -1}).limit(3),
    db.app
    .find({
      status: 'enabled'
    }, {
      permissions: 0,
      dependencies: 0,
      storage: 0,
      slideshow: 0,
    })
    .sort({ date_update: -1 })
    .limit(5),
    db.app
    .find({
      status: 'enabled'
    }, {
      permissions: 0,
      dependencies: 0,
      storage: 0,
      slideshow: 0,
    })
    .sort({ rate: -1 })
    .limit(5),
  ])
  .then(([slideshows, new_apps, top_apps]) => {
    return Promise.map(slideshows, slideshow => {
      return attachFileUrls(req, slideshow);
    }).then(() => {
      res.json({
        slideshows,
        new_apps,
        top_apps,
      });
    }).catch(next);
  })
  .catch(next);
});


api.param('appid', (req, res, next, appid) => {
  validate('appRequest', {appid}, ['appid']);
  db.app.findOne({appid})
  .then(app => {
    if (!app) throw new Error(404);
    req._app = app;
    next();
  });
});

api.get('/app/:appid', (req, res, next) => {
  validate('appRequest', req.params, ['appid']);
  const { appid } = req.params;
  db.app.findOne({ appid: appid }, { metadata: 0 }).then(doc => {
    res.json(doc);
  })
  .catch(next);
});

api.get('/app/:appid/comment', oauthCheck(), (req, res, next) => {
  validate('appRequest', req.params, ['appid']);
  const { appid } = req.params;
  const user = req.user._id;
  db.app.comment.find({
    appid: appid,
  }, {
    appid: 1,
    app_version: 1,
    user: 1,
    rate: 1,
    content: 1,
  }).then(list => {
    list.forEach((item) => {
      item.total_likes = item.likes.length;
      item.is_like = _.some(item.likes, item => item.equals(user));
    });
    return mapObjectIdToData(list, 'user', 'name,avatar', 'user');
  })
  .then(list => {
    res.json(list);
  })
  .catch(next);
});


api.put('/app/:appid/comment/:comment_id/like', oauthCheck(), (req, res, next) => {
  validate('appRequest', req.params, ['comment_id']);
  const { comment_id } = req.params;
  const user = req.user._id;
  db.app.comment.update({
    _id: comment_id
  }, {
    $addToSet: {
      likes: user
    }
  })
  .then(() => res.json({}))
  .catch(next);
});

api.delete('/app/:appid/comment/:comment_id/like', oauthCheck(), (req, res, next) => {
  validate('appRequest', req.params, ['comment_id']);
  const { comment_id } = req.params;
  const user = req.user._id;
  db.app.comment.update({
    _id: comment_id
  }, {
    $pull: {
      likes: user
    }
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.get('/app/:appid/user/comment', oauthCheck(), (req, res, next) => {
  const { appid } = req.params;
  const user = req.user._id;
  db.app.comment.findOne({
    appid,
    user,
    app_version: req._app.version,
  })
  .then(doc => {
    res.json(doc);
  })
  .catch(next);
});

api.post('/app/:appid/comment', oauthCheck(), (req, res, next) => {
  validate('comment', req.body);
  const { appid } = req.params;
  const user = req.user._id;
  const { rate, content } = req.body;
  const app = req._app;
  const now = new Date();
  db.app.comment.findOne({
    appid,
    user,
    app_version: app.version,
  })
  .then(comment => {
    if (comment) {
      return db.app.comment.update({
        _id: comment._id
      }, {
        rate,
        content,
        date_update: now,
      });
    } else {
      return db.app.comment.insert({
        appid,
        app_version: app.version,
        user,
        rate,
        content,
        likes: [],
        date_create: now,
        date_update: now,
      });
    }
  })
  .then(() => {
    return db.app.comment.count({appid});
  })
  .then(count => {
    // TODO: may find a new method like $inc instead $set for summary correctly
    const _rate = app.rate + (rate - app.rate) / count;
    res.json({rate: _rate});
    db.app.update({appid}, { $set: { rate: _rate }});
  })
  .catch(next);
});
