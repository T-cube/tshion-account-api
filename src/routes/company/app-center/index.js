import fs from 'fs';
import express from 'express';
import db from 'lib/database';
import { ObjectId } from 'mongodb';

import { validate } from './schema';
import { ApiError } from 'lib/error';
import { oauthCheck } from 'lib/middleware';

let api = express.Router();
export default api;

api.use(oauthCheck());

api.get('/', (req, res, next) => {
  db.app.find({}, {
    name: 1,
    appid: 1,
    icons: 1,
    version: 1,
    description: 1,
    author: 1
  })
  .then(list => {
    res.json(list);
  })
  .catch(next);
});

api.get('/app', (req, res, next) => {
  let company_id = req.company._id;
  db.company.app.findOne({company_id}).then(doc => {
    if (!doc) {
      return db.company.app.insert({
        company_id,
        apps: []
      }).then(inserted => {
        res.json(inserted);
      });
    }
    res.json(doc);
  }).catch(next);
});

api.post('/app/:appid/add', (req, res, next) => {
  validate('appRequest', req.params, ['appid']);
  let appid = req.params.appid;
  let user_id = req.user._id;
  let company_id = req.company._id;
  db.company.findOne({_id: company_id}).then(company => {
    if (!user_id.equals(company.owner)) {
      throw new ApiError('400', 'permission_dined');
    }
    db.company.app.findOne({company_id}).then(doc => {
      if (!doc) {
        return db.company.app.insert({
          company_id,
          apps: [
            {
              appid,
              enabled: true
            }
          ]
        }).then(app => {
          res.json(app);
        });
      }
      db.company.app.update({
        company_id
      }, {
        $push: {
          apps: {appid, enabled:true}
        }
      }).then(list => {
        res.json(list);
      });
    });
  })
  .catch(next);
});


api.put('/app/:appid/switch', (req, res, next) => {
  validate('appRequest', req.params, ['appid']);
  validate('appRequest', req.body, ['flag']);
  let { flag } = req.body;
  let { appid } = req.params;
  let company_id = req.company._id;
  let user_id = req.user._id;
  db.company.findOne({_id: company_id}).then(doc => {
    if (!doc.owner.equals(user_id)) {
      throw new ApiError('400', 'permission_dined');
    }
    db.company.app.update({
      company_id: company_id,
      'apps.appid': appid
    }, { $set: {
      'apps.$.enabled': flag
    }}).then(doc => {
      res.json(doc);
    });
  })
  .catch(next);
});

api.get('/app/:appid/options', (req, res, next) => {
  validate('appRequest', req.params, ['appid']);
  let { appid } = req.params;
  let company_id = req.company._id;
  db.company.app.config.findOne({appid, company_id}).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.put('/app/:appid/options', (req, res, next) => {
  validate('appRequest', req.params, ['appid']);
  validate('appRequest', req.body, ['options']);
  let { appid } = req.params;
  let { options } = req.body;
  let company_id = req.company._id;
  let user_id = req.user._id;
  db.company.findOne({_id: company_id}).then(doc => {
    if (!doc.owner.equals(user_id)) {
      throw new ApiError('400', 'permission_dined');
    }
    db.company.app.config.update({
      appid,
      company_id
    }, {
      $set: {
        options: options
      }
    }, {
      upsert: true
    }).then(doc => {
      res.json(doc);
    });
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

api.get('/app/:appid/comments', (req, res, next) => {
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

api.put('/app/:appid/comments/:comment_id/like', (req, res, next) => {
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

api.delete('/app/:appid/comments/:comment_id/like', (req, res, next) => {
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

api.post('/app/:appid/comments', (req, res, next) => {
  validate('appRequest', req.params, ['appid']);
  validate('appRequest', req.body, ['comment']);
  let { appid } = req.params;
  let user_id = req.user._id;
  let { app_version, star, content } = req.body;
  db.app.comment.insert({
    user_id,
    appid,
    app_version,
    star,
    content,
    likes: [],
    date_create: new Date()
  }).then(doc => {
    res.json(doc);
    db.app.comment.count({appid}).then(counts => {
      db.app.findOne({appid}).then(app => {
        let score = app.star + (app.star - star)/counts;
        db.app.update({ appid }, { $set: { star: score }});
      });
    });
  })
  .catch(next);
});

api.delete('/remove', (req, res, next) => {
  Promise.all([
    db.app.remove({}),
    db.app.all.remove({}),
    db.company.app.remove({})
  ]).then(([app, all, company]) => {
    res.json({app, all, company});
  });
});
