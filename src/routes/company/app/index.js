import fs from 'fs';
import express from 'express';
import db from 'lib/database';
import _ from 'underscore';
import { ObjectId } from 'mongodb';

import { APP_ROOT_DIR, SRC_ROOT_DIR } from 'bootstrap';
import { ApiError } from 'lib/error';
import { oauthCheck } from 'lib/middleware';

let api = express.Router();
export default api;

api.use(oauthCheck());

const appInstances = {};
const APPS_ROOT = `${APP_ROOT_DIR}/apps`;

function loadAppInstance(dirName) {
  if (!appInstances[dirName]) {
    const relpath = `/apps/${dirName}`;
    const basepath = `${APP_ROOT_DIR}${relpath}`;
    const srcBasepath = `${SRC_ROOT_DIR}${relpath}`;
    const modelPath = `${basepath}/lib/model`;
    const AppClass = require(modelPath).default;
    const instance = new AppClass({
      basepath: srcBasepath,
    });
    const appId = instance.getId();
    appInstances[appId] = instance;
  }
  return appInstances[dirName];
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
    console.log(apiRoute);
    api.use(apiRoute, (req, res, next) => {
      req._app = _app;
      db.company.app.findOne({
        company_id: req.company._id,
        // apps: { $in: [{ app_id: req.query.app_id, enabled: true }] }
      }, {
        apps: 1
      }).then(doc => {
        // if (_.some(doc.apps, item => item.)) {
        //   throw new ApiError(400, 'no_app');
        // }
        next();
      });
    }, require(appDir).default);
    console.log(`app ${appId} loaded.`);
    console.log('--------------------------------------------------------------------------------');
  });
});
