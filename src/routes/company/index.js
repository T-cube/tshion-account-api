import express from 'express';
import { ObjectId } from 'mongodb';

import { ApiError } from '../../lib/error';

/* company collection */
let api = require('express').Router();
module.exports = api;

api.route('/')

  .get((req, res, next) => {
    db.company.find({}, {name: 1, description: 1}).toArray()
    .then(docs => res.json(docs))
    .catch(next);
  })

  .post((req, res, next) => {
    db.company.insert(req.body)
    .then(docs => res.json(docs))
    .catch(next);
  })
;

api.param('company_id', (req, res, next, id) => {
  let company_id = ObjectId(id);
  db.company.findOne({_id: company_id})
  .then(company => {
    if (!company) {
      throw new ApiError(404);
    }
    req.company = company;
    next();
  })
  .catch(next);
});

api.route('/:company_id')

  .get((req, res, next) => {
    res.json(req.company);
  })

  .put((req, res, next) => {
    db.company.update(
      {_id: ObjectId(req.params.company_id)},
      {$set: req.body}
    )
    .then(doc => res.json(doc))
    .catch(next);
  })

  .delete((req, res, next) => {
    db.company.remove({_id: ObjectId(req.params.company_id)})
    .then(function(doc) {
      res.json(doc);
    }).catch(next);
  })
;
api.use('/:company_id/structure', require('./structure'));

  // .use('/member', require('./member'))

;
