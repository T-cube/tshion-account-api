import express from 'express';
import db from 'lib/database';
import Promise from 'bluebird';
import _ from 'underscore';

import { validate } from './schema';
import { ApiError } from 'lib/error';
import { oauthCheck, authCheck } from 'lib/middleware';
import { SRC_ROOT_DIR } from 'bootstrap';
import C from 'lib/constants';

let api = express.Router();
export default api;

api.use(oauthCheck());

api.get('/app', (req, res, next) => {
  let company_id = req.company._id;
  Promise.all([
    db.app.find({}, {
      _id: 1,
      name: 1,
      appid: 1,
      icons: 1,
      version: 1,
      description: 1,
    }),
    db.company.app.findOne({company_id})
  ])
  .then(([all_app, doc]) => {
    if (!doc) {
      let apps = [];
      all_app.forEach(app => {
        app.enabled = true;
        apps.push({
          appid: app.appid,
          enabled: true
        });
      });
      return db.company.app.insert({
        company_id,
        apps
      })
      .then(() => {
        res.json(all_app);
      });
    } else if (all_app.length != doc.apps.length) {
      let company_app = doc.apps;
      let all_app_list = _.pluck(all_app, 'appid');
      let company_app_list = _.pluck(company_app, 'appid');
      let unadd = _.difference(all_app_list, company_app_list);
      unadd.forEach(item => {
        company_app.push({
          appid: item,
          enabled: true
        });
      });
      return db.company.app.update({
        company_id: req.company._id
      }, {
        $set: {
          apps: company_app
        }
      }).then(() => {
        all_app.forEach(item => {
          for (let i = 0; i < company_app.length; i++) {
            if (company_app[i].appid == item.appid) {
              item.enabled = company_app[i].enabled;
            }
          }
        });
        res.json(all_app);
      });
    } else {
      return _mapCompanyAppList(doc)
      .then(company => {
        res.json(company.apps);
      });
    }
  })
  .catch(next);
});

api.param('appid', (req, res, next, appid) => {
  validate('appRequest', {appid}, ['appid']);
  db.app.findOne({appid}, {
    _id: 1,
    name: 1,
    appid: 1,
    icons: 1,
    version: 1,
    description: 1,
  })
  .then(app => {
    if (!app) {
      throw new ApiError(404, 'app_not_found');
    }
    req._app = app;
    next();
  })
  .catch(next);
});

api.post('/app/:appid/add', (req, res, next) => {
  let appid = req.params.appid;
  let user_id = req.user._id;
  let company_id = req.company._id;
  if (!user_id.equals(req.company.owner)) {
    throw new ApiError(400, 'not_company_owner');
  }
  db.company.app.findOne({company_id})
  .then(doc => {
    if (!doc) {
      return db.company.app.insert({
        company_id,
        apps: [
          { appid, enabled: true },
        ]
      });
    } else if (_.some(doc.apps, item => item.appid == appid)) {
      throw new ApiError(400, 'app_already_install');
    } else {
      return db.company.app.update({
        company_id,
      }, {
        $push: {
          apps: { appid, enabled:true },
        }
      });
    }
  })
  .then(() => {
    _incTotalInstalled(appid);
    const app = {
      ...req._app,
      enabled: true,
    };
    db.app.findOne({
      appid,
    })
    .then(a => {
      let info = {
        company: company_id,
        app: a._id,
        action: C.ACTIVITY_ACTION.ADD,
        target_type: C.OBJECT_TYPE.APP_CENTER,
        creator: user_id
      };
      req.model('activity').insert(info);
    });
    res.json(app);
  })
  .catch(next);
});


api.post('/app/:appid/uninstall', authCheck(), (req, res, next) => {
  let appid = req.params.appid;
  let user_id = req.user._id;
  let company_id = req.company._id;
  if (!user_id.equals(req.company.owner)) {
    throw new ApiError('401', 'not_company_owner');
  }
  db.company.app.update({
    company_id
  }, {
    $pull: { apps: { appid } }
  })
  .then(() => {
    let info = require(`${SRC_ROOT_DIR}/apps/${appid}/manifest`);
    let data_base_list = info.storage.mongo;
    return Promise.map(data_base_list, item => {
      return db.collection(`app.store.${appid}.${item}`).remove({
        company_id,
      });
    });
  })
  .then(() => {
    res.json({});
    db.app.findOne({
      appid,
    })
    .then(a => {
      let info = {
        company: company_id,
        app: a._id,
        action: C.ACTIVITY_ACTION.REMOVE,
        target_type: C.OBJECT_TYPE.APP_CENTER,
        creator: user_id
      };
      req.model('activity').insert(info);
    });
    db.app.update({
      appid,
    }, {
      $inc: { total_installed: -1 }
    });
  })
  .catch(next);
});

api.post('/app/:appid/enabled', (req, res, next) => {
  validate('appRequest', req.body, ['enabled']);
  let { appid } = req.params;
  let { enabled } = req.body;
  let user_id = req.user._id;
  const company = req.company;
  if (!company.owner.equals(user_id)) {
    throw new ApiError('401', 'not_company_owner');
  }
  db.company.app.update({
    company_id: company._id,
    'apps.appid': appid,
  }, {
    $set: {
      'apps.$.enabled': enabled,
    }
  })
  .then(() => {
    res.json({});
    db.app.findOne({
      appid,
    })
    .then(a => {
      let info = {
        company: company._id,
        app: a._id,
        action: enabled ? C.ACTIVITY_ACTION.TURN_ON : C.ACTIVITY_ACTION.TURN_OFF,
        target_type: C.OBJECT_TYPE.APP_CENTER,
        creator: user_id
      };
      req.model('activity').insert(info);
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
  validate('appRequest', req.body, ['options']);
  let { appid } = req.params;
  let { options } = req.body;
  let company_id = req.company._id;
  let user_id = req.user._id;
  db.company.findOne({_id: company_id}).then(doc => {
    if (!doc.owner.equals(user_id)) {
      throw new ApiError('400', 'not_company_owner');
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

function _incTotalInstalled(appid) {
  return db.app.update({
    appid,
  }, {
    $inc: { total_installed: 1 }
  });
}

function _mapCompanyAppList(company) {
  return Promise.map(company.apps, item => {
    return db.app.findOne({
      appid: item.appid
    }, {
      _id: 1,
      name: 1,
      appid: 1,
      icons: 1,
      version: 1,
      description: 1,
    }).then(app => {
      return {...app, ...item};
    });
  })
  .then(list => {
    company.apps = list;
    return company;
  });
}
