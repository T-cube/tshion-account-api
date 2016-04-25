import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';

import { ApiError } from 'lib/error';
import upload from 'lib/upload';
import { userId, userInfo } from 'lib/utils';
import { sanitizeValidateObject } from 'lib/inspector';
import { companySanitization, companyValidation } from './schema';

/* company collection */
let api = require('express').Router();
export default api;

api.get('/', (req, res, next) => {
  db.company.find({}, {name: 1, description: 1}).toArray()
  .then(docs => res.json(docs))
  .catch(next);
});

api.post('/', (req, res, next) => {
  let data = req.body;

  let result = sanitizeValidateObject(companySanitization, companyValidation, data);
  if (!result.valid) {
    return next(result.customError);
  }

  data.members = [userInfo()];
  data.owner = userId();

  let position_id = ObjectId();
  _.extend(data, {
    owner: userId(), //TODO fix this
    members: [userInfo()], //TODO fix this
    structure: {
      _id: ObjectId(),
      name: data.name,
      positions: [{
        _id: position_id,
        title: __('administrator'),
      }],
      members: [{
        _id: userId(), // TODO fix this
        title: position_id,
      }],
      children: [],
    },
    projects: [],
  });
  // console.log(data);

  db.company.insert(data)
  .then(docs => res.json(docs))
  .catch(next);
});

api.post('/avatar', upload().single('avatar'), (req, res, next) => {
  res.json({});
})

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

    let data = req.body;
    let result = sanitizeValidateObject(companySanitization, companyValidation, data);
    if (!result.valid) {
      return next(result.customError);
    }
    db.company.update(
      {_id: ObjectId(req.params.company_id)},
      {$set: data}
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

api.use('/:company_id/structure', require('./structure').default);
api.use('/:company_id/member', require('./member').default);
api.use('/:company_id/project', require('./project').default);
api.use('/:company_id/announcement', require('./announcement').default);
