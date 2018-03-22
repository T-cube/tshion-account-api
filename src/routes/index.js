import _ from 'underscore';
import express from 'express';
import bodyParser from 'body-parser';

import { apiErrorHandler } from 'lib/error';
import corsHandler from 'lib/cors';

const api = express.Router();
export default api;

api.use(corsHandler);

api.use((req, res, next) => {
  // req.loadModel('notification', Notification);
  next();
});

let routes = [
  'account',
  'public',
  's',
  'user',
];

_.each(routes, route => {
  let path = '/' + route;
  let file = '.' + path + '/';
  let module = require(file)['default'];
  api.use(path, bodyParser.json(), module);
});
