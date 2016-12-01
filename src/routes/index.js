import _ from 'underscore';
import express from 'express';
import bodyParser from 'body-parser';

import { apiErrorHandler } from 'lib/error';
import corsHandler from 'lib/cors';
import Notification from 'models/notification';
import Activity from 'models/activity';

let api = express.Router();
export default api;

api.use(corsHandler);

api.use((req, res, next) => {
  // req.loadModel('notification', Notification);
  req.loadModel('activity', Activity);
  next();
});

let routes = [
  'account',
  'company',
  'file',
  'notification',
  'public',
  'relation',
  'request',
  's',
  'task',
  'tools',
  'user',
  'weather',
  'wechat',
];

_.each(routes, route => {
  let path = '/' + route;
  let file = '.' + path + '/';
  let module = require(file)['default'];
  if (route == 'wechat') {
    api.use(path, module);
  } else {
    api.use(path, bodyParser.json(), module);
  }
});
