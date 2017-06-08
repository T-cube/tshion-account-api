import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';

import db from 'lib/database';
import { ApiError } from 'lib/error';

const api = express.Router();
export default api;

api.get('/', (req, res, next) => {
  db.approval.template.default.find({})
  .then(templates => res.json(templates))
  .catch(next);
});

api.get('/:tplId', (req, res, next) => {
  let tplId = ObjectId(req.params.tplId);
  db.approval.template.default.findOne({
    _id: tplId
  })
  .then(template => {
    if (!template) {
      throw new ApiError(404);
    }
    template.scope = [_.pick(req.company.structure, '_id', 'name')];
    res.json(template);
  })
  .catch(next);
});
