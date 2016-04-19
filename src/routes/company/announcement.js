import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';

import { ApiError } from '../../lib/error';
import { time } from '../../lib/utils';

/* company collection */
let api = require('express').Router();
export default api;

api.use((req, res, next) => {
  next();
});

api.get('/', (req, res, next) => {
  db.announcement.find({
    company_id: ObjectId(req.company._id),
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.post('/', (req, res, next) => {
  let data = req.body;
  // initial attributes
  data._id = ObjectId();
  data.company_id = req.company._id;
  data.date_create = time();
  db.announcement.insert(data)
  .then(doc => res.json(data._id))
  .catch(next);
});

api.get('/:announcement_id', (req, res, next) => {
  let announcement_id = ObjectId(req.params.announcement_id);
  db.announcement.findOne({
   company_id: ObjectId(req.company._id),
   _id: announcement_id
 })
 .then(data => {
   if (!data) {
     next(new ApiError(404));
     return;
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
