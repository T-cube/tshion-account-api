import express from 'express';
import db from 'lib/database';
import Promise from 'bluebird';

import { validate } from './schema';
import { ApiError } from 'lib/error';
import { oauthCheck } from 'lib/middleware';

let api = express.Router();
export default api;

api.use(oauthCheck());

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
    return Promise.map(doc.apps, item => {
      return db.app.findOne({
        appid: item.appid
      }, {
        _id: 1,
        name: 1,
        appid: 1,
        icons: 1,
        version: 1,
        description: 1,
        author: 1
      }).then(app => {
        item.detail = app;
        return item;
      });
    }).then(apps => {
      res.json(apps);
    });
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


api.delete('/app/:appid/uninstall', (req, res, next) => {
  res.json({});
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
