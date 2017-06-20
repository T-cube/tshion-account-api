import fs from 'fs';
import express from 'express';
import db from 'lib/database';
import _ from 'underscore';
import { ObjectId } from 'mongodb';

import { validate } from './schema';
import { ApiError } from 'lib/error';
import path from 'path';
import { oauthCheck } from 'lib/middleware';

let api = express.Router();
export default api;

api.use(oauthCheck());

api.get('/collection/add', (req, res, next) => {
  db.app.insert({
    appid: 'com.tlifang.activity',
    name: 'activity',
    name_en: 'repoooooooooooooooort',
    version: '0.1.0',
    icons: {
    },
    slideshow: [],
    author: 'Gea',
    author_id: ObjectId('58aaab6003312409f04e128f'),
    description: 'this is an incredible activity app',
    update_info: 'first version',
    star: 5,
    metadata: {
      storage: ['app.store.activity'],
      dependencies: [''],
    },
    published: true,
    date_publish: new Date(),
    date_update: new Date(),
    date_create: new Date(),
  }).then(() => {
    db.app.findOne().then(doc => {
      db.app.version.insert({appid: doc.appid, current: doc._id}).then(doc => {
        res.json(doc);
      });
    });
  });
});

api.get('/', (req, res, next) => {
  db.app.find({}, {
    app_name: 1,
    appid: 1,
    icons: 1,
    version: 1,
    description: 1,
    author: 1
  })
  .then(list => {
    res.json(list);
  });
});

// api.get('/overview', (req, res, next) => {
//   db.app.find({published: true}, {app_name: 1, icons: 1}).then(list => {
//     res.json(list);
//   });
// });

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
  });
});

api.post('/app/:app_id/add', (req, res, next) => {
  validate('appRequest', req.params, ['app_id']);
  let app_id = req.params.app_id;
  let user_id = req.user._id;
  let company_id = req.company._id;
  db.company.findOne({_id: company_id}).then(doc => {
    if (doc.owner.equals(user_id)) {
      throw new ApiError('400', 'permission_dined');
    }
    db.company.app.findOne({company_id}).then(doc => {
      if (!doc) {
        return db.company.app.insert({
          company_id,
          apps: [
            {
              app_id,
              enabled: true
            }
          ]
        }).then(doc => {
          res.json(doc);
        });
      }
      db.company.app.update({
        company_id
      }, {
        $push: {
          apps: {app_id, enabled:true}
        }
      }).then(doc => {
        res.json(doc);
      });
    });
  });
});


api.put('/app/:app_id/switch', (req, res, next) => {
  validate('appRequest', req.params, ['app_id']);
  validate('appRequest', req.body, ['flag']);
  let { flag } = req.body;
  let { app_id } = req.params;
  let company_id = req.company._id;
  let user_id = req.user._id;
  db.company.findOne({_id: company_id}).then(doc => {
    if (doc.owner.equals(user_id)) {
      throw new ApiError('400', 'permission_dined');
    }
    db.company.app.update({
      company_id: company_id,
      'apps.app_id': app_id
    }, { $set: {
      'apps.$.enabled': flag
    }}).then(doc => {
      res.json(doc);
    });
  })
  .catch(next);
});

api.get('/app/:app_id/options', (req, res, next) => {
  validate('appRequest', req.params, ['app_id']);
  let { app_id } = req.params;
  let company_id = req.company._id;
  db.company.app.config.findOne({app_id, company_id}).then(doc => {
    res.json(doc);
  });
});

api.put('/app/:app_id/options', (req, res, next) => {
  validate('appRequest', req.params, ['app_id']);
  validate('appRequest', req.body, ['options']);
  let { app_id } = req.params;
  let { options } = req.body;
  let company_id = req.company._id;
  let user_id = req.user._id;
  db.company.findOne({_id: company_id}).then(doc => {
    if (doc.owner.equals(user_id)) {
      throw new ApiError('400', 'permission_dined');
    }
    db.company.app.config.update({
      app_id,
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


api.get('/app/:app_id', (req, res, next) => {
  validate('appRequest', req.params, ['app_id']);
  let { app_id } = req.params;
  db.app.findOne({ _id: app_id }, { metadata: 0 }).then(doc => {
    res.json(doc);
  });
});

api.get('/app/:app_id/comments', (req, res, next) => {
  validate('appRequest', req.params, ['app_id']);
  let { app_id } = req.params;
  let user_id = req.user._id;
  db.app.comment.aggregate([
    { $match: {app_id} },
    {
      $project: {
        app_id: 1,
        app_version: 1,
        user_id: 1,
        star: 1,
        content: 1,
        totalLikes: { $size: '$likes'},
        isLike: {
          $in: [user_id, '$likes']
        }
      }
    }
  ]).then(list => {
    res.json(list);
  });
});

api.put('/app/:app_id/comments/:comment_id/like', (req, res, next) => {
  validate('appRequest', req.params, ['app_id', 'comment_id']);
  let { app_id, comment_id } = req.params;
  let user_id = req.user._id;
  db.app.comment.update({
    _id: comment_id
  }, {
    $push: {
      likes: user_id
    }
  })
  .then(doc => res.json(doc));
});

api.delete('/app/:app_id/comments/:comment_id/like', (req, res, next) => {
  validate('appRequest', req.params, ['app_id', 'comment_id']);
  let { app_id, comment_id } = req.params;
  let user_id = req.user._id;
  db.app.comment.update({
    _id: comment_id
  }, {
    $pull: {
      likes: user_id
    }
  })
  .then(doc => res.json(doc));
});

api.post('/app/:app_id/comments', (req, res, next) => {
  validate('appRequest', req.params, ['app_id']);
  validate('appRequest', req.body, ['comment']);
  let { app_id } = req.params;
  let user_id = req.user._id;
  let { app_version, star, content } = req.body;
  db.app.comment.insert({
    user_id,
    app_id,
    app_version,
    star,
    content,
    likes: [],
    date_create: new Date()
  }).then(doc => {
    res.json(doc);
  });
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
