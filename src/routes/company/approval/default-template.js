import _ from 'underscore';
import express from 'express';

import { ApiError } from 'lib/error';
import templates from './approval-templates';

let api = express.Router();
export default api;

api.get('/', (req, res, next) => {
  res.json(templates);
});

api.get('/:tplId', (req, res, next) => {
  let template = _.clone(_.find(templates, tpl => tpl._id == req.params.tplId));
  if (!template) {
    throw new ApiError(404);
  }
  template.scope = [_.pick(req.company.structure, '_id', 'name')];
  res.json(template);
});
