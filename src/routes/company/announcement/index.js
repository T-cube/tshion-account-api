import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';

import { ApiError } from '../../../lib/error';
import { time } from '../../../lib/utils';
import inspector from '../../../lib/inspector';
import { sanitization, validation } from './schema';

/* company collection */
let api = require('express').Router();
export default api;

api.use((req, res, next) => {
  next();
});

api.get('/', (req, res, next) => {
  db.announcement.find({
    company_id: req.company._id,
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.post('/', (req, res, next) => {
  let data = req.body;

  // sanitization
  inspector.sanitize(sanitization, data);

  // validation
  let result = inspector.validate(validation, data);
  if (!result.valid) {
    return next(new ApiError(400, null, result.error));
  }

  // initial attributes
  data.company_id = req.company._id;
  data.date_create = time();
  db.announcement.insert(data)
  .then(doc => res.json(doc))
  .catch(next);
});

api.get('/:announcement_id', (req, res, next) => {
  let announcement_id = ObjectId(req.params.announcement_id);
  db.announcement.findOne({
   company_id: req.company._id,
   _id: announcement_id
 })
 .then(data => {
   if (!data) {
     return next(new ApiError(404));
   }
   res.json(data);
 })
  .catch(next);
});

api.delete('/:announcement_id', (req, res, next) => {
  let announcement_id = ObjectId(req.params.announcement_id);
  db.announcement.remove({
    company_id: req.company._id,
    _id: announcement_id
  })
  .then(doc => res.json({}))
  .catch(next);
});
