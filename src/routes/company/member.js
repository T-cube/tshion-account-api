import express from 'express';
import { ObjectId } from 'mongodb';

import { ApiError } from '../../lib/error';
import Structure from '../../lib/structure';

/* company collection */
let api = require('express').Router();
module.exports = api;

api.use((req, res, next) => {
  next();
});

api.get('/', (req, res, next) => {
  res.json(req.company.members || []);
});

api.post('/', (req, res, next) => {
  let data = req.body;
  data._id = ObjectId();
  db.company.update({
    _id: req.company._id,
  }, {
    $push: {members: data}
  })
  .then(doc => res.json(data))
  .catch(next);
});

api.put('/:member_id', (req, res, next) => {
  let member_id = req.params.member_id;
  let data = req.body;
  db.company.update({
    _id: req.company._id,
    'members._id': member_id
  }, {
    $set: {'members.$': data}
  })
  .then(doc => res.json(data))
  .catch(next);
});

api.delete('/node/:member_id', (req, res, next) => {
  let member_id = req.params.member_id;
  let data = req.body;
  db.company.update({
    _id: req.company._id,
  }, {
    $pull: {members: {_id: member_id}}
  })
  .then(doc => res.json(data))
  .catch(next);
});
