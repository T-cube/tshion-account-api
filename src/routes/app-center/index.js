import express from 'express';
import db from 'lib/database';
import _ from 'underscore';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';
import { validate } from './schema';
import { ApiError } from 'lib/error';


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

api.get('/company/app', (req, res, next) => {
  // let company_id = req.company._id;
  // return db.company.app.find({company_id}).then(list => {
  //   let apps = list.apps;
  //   return mapObjectIdToData(apps, 'app');
  // }).then(apps => {
  //   let company_apps = _.filter(apps, app => {
  //     return app.status == 'used';
  //   });
  //   res.json(company_apps);
  // });
  // db.app.version.find({published:true}, {current: 1}).then(list => {
  //   let applist = _.map(list, item => {
  //     return {_id: item.current};
  //   });
  //   return mapObjectIdToData(applist, 'app');
  // }).then(list => {
  //   let apps = _.map(list, item => {
  //     delete item.metadata;
  //     return item;
  //   });
  // });
  db.app.find({published: true}, {metadata:0, model:0}).then(list => {
    res.json(list);
  });
});

api.get('/company/:company_id/app/:app_id/add', (req, res, next) => {
  let app_id = ObjectId(req.params.app_id);
  let company_id = ObjectId(req.params.company_id);
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

api.post('/company/:company_id/app/switch', (req, res, next) => {
  let flag = req.body.flag;
  let app_id = ObjectId(req.body.app_id);
  let company_id = ObjectId(req.params.company_id);
  db.company.app.update({
    company_id: company_id,
    'apps.app_id': app_id
  }, { $set: {
    'apps.$.enabled': flag
  }}).then(doc => {
    res.json(doc);
  });
});

api.get('/company/:company_id/app/:app_id/options', (req, res, next) => {
  let app_id = ObjectId(req.params.app_id);
  let company_id = ObjectId(req.params.company_id);
  db.company.app.config.findOne({app_id, company_id}).then(doc => {
    res.json(doc);
  });
});

api.post('/company/:company_id/app/:app_id/options', (req, res, next) => {
  let options = req.body.options;
  let app_id = ObjectId(req.params.app_id);
  let company_id = ObjectId(req.params.company_id);
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

api.get('/app/list', (req, res, next) => {
  db.app.find({published: true}, {app_name: 1, icons: 1}).then(list => {
    res.json(list);
  });
});

api.get('/app/detail/:app_id', (req, res, next) => {
  let app_id = ObjectId(req.params.app_id);
  db.app.findOne({_id: app_id},{metadata:0}).then(doc => {
    res.json(doc);
  });
});

api.get('/app/:user_id/comments/:app_id', (req, res, next) => {
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
  let user_id = req.params.user_id;
  db.app.comment.update({_id: comment_id},{ $addToSet: {likes: user_id}}).then(doc => res.json(doc));
});

api.get('/app/:user_id/comments/:comment_id/unlike', (req, res, next) => {
  let comment_id = ObjectId(req.params.comment_id);
  let user_id = req.params.user_id;
  db.app.comment.update({_id: comment_id},{ $pull: {likes: user_id}}).then(doc => res.json(doc));
});

api.post('/app/:user_id/comments/create', (req, res, next) => {
  let user_id = ObjectId(req.params.user_id);
  let app_id = ObjectId(req.body.app_id);
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

api.get('/app/test', (req, res, next) => {
  db.company.find({
    projects: {$in: [ObjectId('574f85066a400ffd0f40d131')]}
  }).then(doc => {
    res.json(doc);
  });
  db.company.aggregate([
    {$match: {owner:ObjectId('574f087d6a400ffd0f40d0fb')}},
    {$project: {
      // name:0,
      totalProjects: { $size: '$projects'},
      inproject: {
        $in: [ObjectId('574f85066a400ffd0f40d131'), '$projects']
      },
    }}
  ]).then(list => {
    res.json(list);
    // Promise.map(list, item => {
    //   return db.company.count({_id: item._id, projects: {$in: [ObjectId('574f85066a400ffd0f40d131')]}}).then(doc => {
    //     item.hasProject = doc;
    //     return item;
    //   })
    // }).then(list => {
    //   res.json(list);
    // });
    // return db.company.count({_id:ObjectId('574f84726a400ffd0f40d121'),projects: {$in: [ObjectId('574f85066a400ffd0f40d131')]}}).then(doc => {
    //   console.log(doc);
    //   res.json(list);
    // });
  });
});

// api.get('/app', (req, res, next) => {
//   // validate('appRequest', req.query);
//   let { app_id, company_id, user_id } = req.query;
//   let { type, operation } = req.body;
//   db.app.findOne({_id: ObjectId(app_id)}).then(doc => {
//     return selectModel(doc.model, {company_id, user_id}).routeOperation({type, operation}).then(result =>
//       res.json(result)
//     ).catch(next);
//   }).catch(next);
// });
//
// api.post('/app', (req, res, next) => {
//   // validate('appRequest', req.query);
//   let { app_id, company_id, user_id } = req.query;
//   let { type, operation } = req.body;
//   db.app.findOne({_id: app_id}).then(doc => {
//     return selectModel(doc.model, {company_id, user_id}).routeOperation({type, operation}).then(result =>
//       res.json(result)
//     ).catch(next);
//   }).catch(next);
// });
//
// api.delete('/app', (req, res, next) => {
//   // validate('appRequest', req.query);
//   let { app_id, company_id, user_id } = req.query;
//   let { type, operation } = req.body;
//   db.app.findOne({_id: ObjectId(app_id)}).then(doc => {
//     return selectModel(doc.model, {company_id, user_id}).routeOperation({type, operation}).then(result =>
//       res.json(result)
//     ).catch(next);
//   }).catch(next);
// });
//
// api.put('/app', (req, res, next) => {
//   // validate('appRequest', req.query);
//   let { app_id, company_id, user_id } = req.query;
//   let { type, operation } = req.body;
//   db.app.findOne({_id: ObjectId(app_id)}).then(doc => {
//     return selectModel(doc.model, {company_id, user_id}).routeOperation({type, operation}).then(result =>
//       res.json(result)
//     ).catch(next);
//   }).catch(next);
// });
//
// function selectModel(model, props) {
//   switch (model) {
//   case 'notebook':
//     return Notebook;
//   default:
//     throw new ApiError('400', 'invalid_model');
//   }
// }

/**
 * query string
 * @param {string} target
 * @param {ObjectId} app_id
 * @param {ObjectId} user_id
 * @param {ObjectId} company_id
 * @param {ObjectId} note_id optional
 * @param {ObjectId} tag_id optional
 *
 */

function targetError() {
  throw new ApiError('400', 'query_target_error');
}

api.use('/app/notebook/', (req, res, next) => {
  _.indexOf(['user', 'tag', 'note', 'like', 'notebook', 'shared', 'comment', 'note', 'noteAddTag', 'noteDeleteTag', 'noteShare'], req.query.target) || targetError();
  validate('appRequest', req.query);
  req.url = '/' + req.query.target;
  // db.app.findOne({_id: req.query.app_id}).then(doc => {
  //   if (!doc) throw new ApiError('400', 'invalid_app');
  // });
  next();
}, require('./app-notebook').default);
