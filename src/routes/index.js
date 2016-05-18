import _ from 'underscore';
import express from 'express';
import bodyParser from 'body-parser';

import { apiErrorHandler } from 'lib/error';
import corsHandler from 'lib/cors';
import Message from 'models/message';

let api = express.Router();
export default api;

api.use(corsHandler);

api.use(bodyParser.json());

api.use((req, res, next) => {
  req.loadModel('message', Message);
  next();
});

let routes = [
  'account',
  'company',
  'message',
  'relation',
  'request',
  'task',
  'user',
  'attendence',
];

_.each(routes, route => {
  let path = '/' + route;
  let file = '.' + path + '/';
  let module = require(file)['default'];
  api.use(path, module);
});
