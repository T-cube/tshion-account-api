import _ from 'underscore';
import express from 'express';
import bodyParser from 'body-parser';

import { apiErrorHandler } from 'lib/error';
import corsHandler from 'lib/cors';

let api = express.Router();
export default api;

api.use(corsHandler);

api.use(bodyParser.json());

let routes = [
  'account',
  'company',
  'relation',
  'task',
  'user',
];

_.each(routes, route => {
  let path = '/' + route;
  let file = '.' + path + '/';
  let module = require(file)['default'];
  api.use(path, module);
});
