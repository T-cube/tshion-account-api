import fs from 'fs';
import express from 'express';
import db from 'lib/database';
import _ from 'underscore';
import { ObjectId } from 'mongodb';
import app from 'index';
import path from 'path';

import { APP_ROOT_DIR, SRC_ROOT_DIR } from 'bootstrap';
import { ApiError } from 'lib/error';
import { oauthCheck } from 'lib/middleware';

let api = express.Router();
export default api;

api.use(oauthCheck());

const appInstances = {};
const APPS_ROOT = `${APP_ROOT_DIR}/apps`;

function loadAppInstance(appId) {
  const modelId = `app-${appId}`;
  if (!appInstances[appId]) {
    const src_root_dir = path.normalize(SRC_ROOT_DIR);
    const relpath = `/apps/${appId}`;
    const basepath = `${APP_ROOT_DIR}${relpath}`;
    const srcBasepath = `${src_root_dir}${relpath}`;
    const modelPath = `${basepath}/lib/model`;
    const AppClass = require(modelPath).default;
    const instance = new AppClass({
      basepath: srcBasepath,
    });
    const _appId = instance.getId();
    if (_appId != appId) {
      throw new Error('appid does not match directory name');
    }
    appInstances[appId] = instance;
    app.bindModel(modelId, instance);
  }
  return appInstances[appId];
}

function getAppInstance(appId) {
  if (!appInstances[appId]) {
    throw new ApiError(404, 'app_not_exists');
  }
  return appInstances[appId];
}

fs.readdir(APPS_ROOT, (err, result) => {
  _.each(result, dirName => {
    const _app = loadAppInstance(dirName);
    const appId = _app.getId();
    _app.install();
    const apiRoute = `/${appId}`;
    const appDir = `${APPS_ROOT}${apiRoute}/lib/routes`;
    console.log(`app ${appId} starting...`);
    api.use(apiRoute, (req, res, next) => {
      req._app = _app;
      Promise.all([
        db.app.findOne({
          appid: appId
        }, {
          status: 1
        }),
        db.company.app.findOne({
          company_id: req.company._id,
        }, {
          apps: 1
        }),
      ]).then(([app, doc]) => {
        if (!app || app.status != 'enabled') {
          throw new ApiError(400, 'app_is_forbidden');
        }
        if (_.some(doc.apps, item => item.appid == appId && item.enabled)) {
          next();
        } else {
          throw new ApiError(400, 'no_app');
        }
      })
      .catch(err => {
        next(err);
      });
    }, require(appDir).default);
    console.log(`app ${appId} loaded.`);
    console.log('--------------------------------------------------------------------------------');
  });
});
