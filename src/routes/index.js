import _ from 'underscore';
import express from 'express';
import bodyParser from 'body-parser';

import { apiErrorHandler } from 'lib/error';
import corsHandler from 'lib/cors';
import Notification from 'models/notification';

const api = express.Router();
export default api;

api.use(corsHandler);

api.use((req, res, next) => {
  // req.loadModel('notification', Notification);
  next();
});

let routes = [
  'account',
  'app-center',
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
  'payment',
  'invite',
];

routes = routes.concat([
  'activity'
]);

_.each(routes, route => {
  let path = '/' + route;
  let file = '.' + path + '/';
  let module = require(file)['default'];
  if (route == 'wechat') {
    api.use(path, module);
  } else {
    api.use(path, module);
  }
});
