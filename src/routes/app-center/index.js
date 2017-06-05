import fs from 'fs';
import express from 'express';
import db from 'lib/database';
import _ from 'underscore';
import { ObjectId } from 'mongodb';
import { validate } from './schema';
import { ApiError } from 'lib/error';
import path from 'path';


let api = express.Router();
export default api;

api.get('/collection/add', (req, res, next) => {
  db.app.insert({
    appid: 'com.tlifang.app.notebook',
    name: 'notebook',
    name_en: 'nottttttteeeeeboooooooook',
    version: '0.1.0',
    icons: {
      '16': '',
      '64': '',
      '128': '',
    },
    slideshow: ['','','','','',],
    author: 'Gea',
    author_id: ObjectId('58aaab6003312409f04e128f'),
    description: 'this is an incredible note app',
    update_info: 'first version',
    star: 5,
    metadata: {
      storage: ['app.store.note'],
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

api.get('/app/all', (req, res, next) => {
  db.app.find({published: true}, {metadata:0, published:0}).then(list => {
    res.json(list);
  });
});

api.get('/company/:company_id/app/list', (req, res, next) => {
  let company_id = ObjectId(req.params.company_id);
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

api.get('/company/:company_id/operator/:user_id/app/:app_id/add', (req, res, next) => {
  let app_id = ObjectId(req.params.app_id);
  let company_id = ObjectId(req.params.company_id);
  let user_id = ObjectId(req.params.user_id);
  db.company.findOne({_id: company_id}).then(doc => {
    if (doc.owner != user_id) next(new ApiError('400', 'permisson_dined'));
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
      db.company.app.update({company_id}, {$push: {apps: {app_id, enabled:true}}}).then(doc => {
        res.json(doc);
      });
    });
  });
});


api.post('/company/:company_id/operator/:user_id/app/:app_id/switch', (req, res, next) => {
  let flag = req.body.flag;
  let app_id = ObjectId(req.params.app_id);
  let company_id = ObjectId(req.params.company_id);
  let user_id = ObjectId(req.params.user_id);
  db.company.findOne({_id: company_id}).then(doc => {
    if (doc.owner != user_id) throw new ApiError('400', 'permisson_dined');
    db.company.app.update({
      company_id: company_id,
      'apps.app_id': app_id
    }, { $set: {
      'apps.$.enabled': flag
    }}).then(doc => {
      res.json(doc);
    });
  });
});

api.get('/company/:company_id/app/:app_id/options', (req, res, next) => {
  let app_id = ObjectId(req.params.app_id);
  let company_id = ObjectId(req.params.company_id);
  db.company.app.config.findOne({app_id, company_id}).then(doc => {
    res.json(doc);
  });
});

api.put('/company/:company_id/operator/:user_id/app/:app_id/options', (req, res, next) => {
  let options = req.body.options;
  let app_id = ObjectId(req.params.app_id);
  let company_id = ObjectId(req.params.company_id);
  let user_id = ObjectId(req.params.user_id);
  db.company.findOne({_id: company_id}).then(doc => {
    if (doc.owner != user_id) throw new ApiError('400', 'permisson_dined');
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
  });
});

api.get('/app/list', (req, res, next) => {
  db.app.find({published: true}, {app_name: 1, icons: 1}).then(list => {
    res.json(list);
  });
});

api.get('/app/:app_id/detail', (req, res, next) => {
  let app_id = ObjectId(req.params.app_id);
  db.app.findOne({_id: app_id},{metadata:0}).then(doc => {
    res.json(doc);
  });
});

api.get('/app/:app_id/:user_id/comments', (req, res, next) => {
  let app_id = ObjectId(app_id);
  let user_id = ObjectId(user_id);
  db.app.comment.aggregate([
    { $match: {app_id}},
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

api.get('/app/:user_id/comments/:comment_id/like', (req, res, next) => {
  let comment_id = ObjectId(req.params.comment_id);
  let user_id = ObjectId(req.params.user_id);
  db.app.comment.update({_id: comment_id},{ $addToSet: {likes: user_id}}).then(doc => res.json(doc));
});

api.get('/app/:user_id/comments/:comment_id/unlike', (req, res, next) => {
  let comment_id = ObjectId(req.params.comment_id);
  let user_id = ObjectId(req.params.user_id);
  db.app.comment.update({_id: comment_id},{ $pull: {likes: user_id}}).then(doc => res.json(doc));
});

api.post('/app/:app_id/:user_id/comments/create', (req, res, next) => {
  let user_id = ObjectId(req.params.user_id);
  let app_id = ObjectId(req.params.app_id);
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

api.get('/app/pic', (req, res, next) => {
  let dir = path.normalize(`${__dirname}/../../../public/cdn` + req.query.path);
  fs.readFile(dir, (err, data) => {
    if (err) {
      return next(new ApiError('400', 'no_such_directory'));
    }
    res.set('Content-Type', 'image/png');
    res.status(200).send(data);
  });
});

/**
 * query string
 * @param {string} target
 * @param {ObjectId} user_id
 * @param {ObjectId} company_id
 * @param {ObjectId} note_id optional
 * @param {ObjectId} tag_id optional
 *
 */

const appInstances = {};

function loadAppInstance(appName) {
  if (!appInstances[appName]) {
    const modelPath = `${__dirname}/app/${appName}/model`;
    const AppClass = require(modelPath).default;
    appInstances[appName] = new AppClass();
  }
  return appInstances[appName];
}

fs.readdir(__dirname + '/app', (err, result) => {
  _.each(result, appName => {
    console.log(`app ${appName} starting...`);
    const apiRoute = `/app/${appName}`;
    const appDir = __dirname + apiRoute;
    api.use(apiRoute, (req, res, next) => {
      req._app = loadAppInstance(appName);
      validate('appRequest', req.query);
      req.url = '/' + req.query.target;
      next();
    }, require(appDir).default);
    console.log(`app ${appName} loaded.`);
    console.log('--------------------------------------------------------------------------------');
  });
});
