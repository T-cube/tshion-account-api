import express from 'express';
import db from 'lib/database';
import C from 'lib/constants';
import _ from 'underscore';

import { ApiError } from 'lib/error';
import { upload, saveCdn } from 'lib/upload';
import { validate } from './schema';
import { oauthCheck } from 'lib/middleware';
import { mapObjectIdToData } from 'lib/utils';

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

api.get('/store/index', (req, res, next) => {
  Promise.all([
    db.app.slideshow.find({}, {pic_url: 1, appid: 1}).limit(3),
    db.app
    .find({}, {
      permissions: 0,
      dependencies: 0,
      storage: 0,
      slideshow: 0,
    })
    .sort({ date_update: -1 })
    .limit(5),
    db.app
    .find({}, {
      permissions: 0,
      dependencies: 0,
      storage: 0,
      slideshow: 0,
    })
    .sort({ star: -1 })
    .limit(5),
  ])
  .then(([slideshows, new_apps, top_apps]) => {
    res.json({
      slideshows,
      new_apps,
      top_apps,
    });
  })
  .catch(next);
});

api.post('/slideshow/upload',
oauthCheck(),
upload({type: 'attachment'}).single('document'),
(req, res, next) => {
  let file = req.file;
  if (!file) {
    throw new ApiError(400, 'file_not_upload');
  }
  const qiniu = req.model('qiniu').bucket('cdn-public');
  qiniu.upload(file.cdn_key, file.path).then(data => {
    let slide_file = _.extend({}, file,
      {
        pic_url: `${data.server_url}${file.cdn_key}`,
        appid: req.body.appid,
      }
    );
    db.app.slideshow.insert(slide_file)
    .then(doc => {
      res.json(doc);
    });
  });
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
  let user = req.user._id;
  db.app.comment.aggregate([
    { $match: {appid} },
    {
      $project: {
        appid: 1,
        app_version: 1,
        user: 1,
        star: 1,
        content: 1,
        total_likes: { $size: '$likes'},
        is_like: {
          $in: [user, '$likes']
        }
      }
    }
  ]).then(list => {
    return mapObjectIdToData(list, 'user', 'name,avatar', 'user');
  })
  .then(list => {
    res.json(list);
  })
  .catch(next);
});

api.put('/app/:appid/comment/:comment_id/like', oauthCheck(), (req, res, next) => {
  validate('appRequest', req.params, ['appid', 'comment_id']);
  let { appid, comment_id } = req.params;
  let user = req.user._id;
  db.app.comment.update({
    _id: comment_id
  }, {
    $push: {
      likes: user
    }
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.delete('/app/:appid/comment/:comment_id/like', oauthCheck(), (req, res, next) => {
  validate('appRequest', req.params, ['appid', 'comment_id']);
  let { appid, comment_id } = req.params;
  let user = req.user._id;
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
  validate('appRequest', req.params, ['appid']);
  let { appid } = req.params;
  let user = req.user._id;
  db.app.comment.find({
    appid,
    user
  })
  .then(list => {
    _.map(list, item => {
      item.total_likes = item.likes.length;
      item.is_like = _.some(item.likes, l => l.equals(user));
      delete item.likes;
      return item;
    });
    res.json(list);
  })
  .catch(next);
});

api.post('/app/:appid/comment', oauthCheck(), (req, res, next) => {
  validate('appRequest', req.params, ['appid']);
  validate('appRequest', req.body, ['comment']);
  let { appid } = req.params;
  let user = req.user._id;
  let { star, content } = req.body;
  let app;
  db.app.findOne({
    appid
  })
  .then(doc => {
    app = doc;
    return db.app.comment.findOne({
      user,
      appid,
      app_version: app.version
    });
  })
  .then(comment => {
    if (comment) {
      return db.app.comment.update({
        _id: comment._id
      }, {
        star,
        content,
        date_update: new Date(),
      });
    } else {
      return db.app.comment.insert({
        app_version: app.version,
        user,
        appid,
        star,
        content,
        likes: [],
        date_create: new Date(),
        date_update: new Date(),
      });
    }
  })
  .then(() => {
    return db.app.comment.count({appid});
  })
  .then(counts => {
    let score = app.star + (star - app.star)/counts;
    res.json({star: score});
    // TODO: may find a new method like $inc instead $set for summary correctly
    db.app.update({appid}, { $set: { star: score }});
  })
  .catch(next);
});
