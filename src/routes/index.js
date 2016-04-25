import _ from 'underscore';
import express from 'express';
import bodyParser from 'body-parser';

import { apiErrorHandler } from 'lib/error';
import corsHandler from 'lib/cors';

//TODO remove this
import { userInfo } from 'lib/utils';

let api = express.Router();
export default api;

api.use(corsHandler);

//TODO remove this
api.use((req, res, next) => {
  req.user = userInfo();
  next();
})

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

// api.use(apiErrorHandler);
