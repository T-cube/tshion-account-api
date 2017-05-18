import express from 'express';
import db from 'lib/database';
import _ from 'underscore';
import { mapObjectIdToData } from 'lib/utils';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';


let api = express.Router();
export default api;

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
  db.version.find({}, {current: 1}).then(list => {
    let applist = _.map(list, item => {
      return {_id: item.current};
    });
    return mapObjectIdToData(applist, 'app');
  }).then(list => {
    let apps = _.map(list, item => {
      delete item.metadata;
      return item;
    });
    res.json(apps);
  });
});

api.post('/company/app/switch', (req, res, next) => {
  let { app_id, flag } = req.body;
  let company_id = req.company._id;
  db.company.app.updage({
    company_id: company_id,
    'apps.app_id': app_id
  }, { $set: {
    'apps.$.enabled': flag
  }}).then(() => {
    res.json();
  });
});

api.get('/company/app/:app_id/options', (req, res, next) => {
  let app_id = req.params.app_id;
  let company_id = req.company._id;
  db.company.app.config.findOne({app_id, company_id}).then(doc => {
    res.json(doc);
  });
});

api.post('/company/app/options', (req, res, next) => {
  let { app_id, options } = req.body;
  let company_id = req.company._id;
  db.company.app.config.update({
    app_id,
    company_id
  }, {
    $set: {
      options: options
    }
  }).then(() => {
    res.json();
  });
});

api.get('/app/list', (req, res, next) => {
  db.app.find({status: 'used'}, {app_name: 1, icon: 1}).then(list => {
    res.json(list);
  });
});

api.get('/app/detail/:app_id', (req, res, next) => {
  let app_id = req.params.app_id;
  db.app.findOne({_id: app_id}).then(doc => {
    res.json(doc);
  });
});

api.get('/app/comments/:app_id', (req, res, next) => {
  let app_id = req.params.app_id;
  db.app.comment.aggregate([
    { $match: {app_id}},
    {
      $project: {
        app_id: 1,
        app_version: 1,
        user_id: 1,
        star: 1,
        content: 1,
        totalLikes: { $size: 'likes'}
      }
    }
  ]).then(list => {
    res.json(list);
  });
});

api.get('/app/comments/:comment_id/like', (req, res, next) => {
  let comment_id = req.params.comment_id;
  let user_id = req.user._id;
  db.app.comment.update({_id: comment_id},{ $push: {likes: user_id}}).then(() => res.json());
});

api.get('/app/comments/:comment_id/unlike', (req, res, next) => {
  let comment_id = req.params.comment_id;
  let user_id = req.user._id;
  db.app.comment.update({_id: comment_id},{ $pull: {likes: user_id}}).then(() => res.json());
});

api.post('/app/comments/create', (req, res, next) => {
  let user_id = req.user._id;
  let { app_id, app_version, star, content } = req.body;
  db.app.comment.insert({
    user_id,
    app_id,
    app_version,
    star,
    content,
    likes: [],
    date_create: new Date()
  }).then(() => {
    res.json();
  });
});

api.get('/app/test', (req, res, next) => {
  db.company.aggregate([
    {$match: {owner:ObjectId('574f087d6a400ffd0f40d0fb')}},
    {$project: {
      name:1,
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
