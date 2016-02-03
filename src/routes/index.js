import _ from 'underscore';
import express from 'express';
import bodyParser from 'body-parser';

import { apiErrorHandler } from '../lib/error';
import corsHandler from '../lib/cors';

let api = express.Router();

module.exports = api;

api.use(corsHandler);

api.use(bodyParser.json());

var routes = ['user','company','account','relation'];

_.each(routes, function(route){
  var path = '/' + route;
  var file = '.' + path + '/';
  api.use(path, require(file));
});

api.use(apiErrorHandler);
