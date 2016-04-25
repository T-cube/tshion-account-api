import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';

import { ApiError } from 'lib/error';
import upload from 'lib/upload';
import { userId, userInfo } from 'lib/utils';
import { sanitizeValidateObject } from 'lib/inspector';
import { companySanitization, companyValidation } from './schema';
import C from 'lib/constants';

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

  sanitizeValidateObject(companySanitization, companyValidation, data);

  data.members = [req.user];
  data.owner = req.user._id;

  let position_id = ObjectId();
  _.extend(data, {
    owner: req.user._id, //TODO fix this
    members: [req.user], //TODO fix this
    structure: {
      _id: ObjectId(),
      name: data.name,
      positions: [{
        _id: position_id,
        title: __('administrator'),
      }],
      members: [{
        _id: req.user._id, // TODO fix this
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
    sanitizeValidateObject(companySanitization, companyValidation, data);
    
    db.company.update(
      {_id: ObjectId(req.params.company_id)},
      {$set: data}
    )
    .then(doc => res.json(doc))
    .catch(next);
  })

  .delete((req, res, next) => {
    let user_id = ObjectId(req.body.user_id);
    let company = req.company;
    if (!req.user._id.equals(company.owner)) {
      throw new ApiError(403, null, 'only owner can carry out this operation');
    }
    db.company.remove({_id: ObjectId(req.params.company_id)})
    .then(function(doc) {
      res.json(doc);
    }).catch(next);
  })
;

api.post('/:company_id/avatar', upload().single('avatar'), (req, res, next) => {
  res.json({});
})

api.post('/:company_id/transfer', (req, res, next) => {
  //TODO add two way checking
  console.log(req.body);
  let user_id = ObjectId(req.body.user_id);
  let company = req.company;
  if (!req.user._id.equals(company.owner)) {
    throw new ApiError(403, null, 'only owner can carry out this operation');
  }
  let member = _.find(company.members, m => m._id.equals(user_id));
  console.log('user_id=', user_id, 'member=', member)
  if (!member) {
    throw new ApiError(404, null, 'member not exists');
  }
  db.user.find({_id: user_id})
  .then(user => {
    if (!user) {
      throw new ApiError(404, null, 'user not exists');
    }
    return Promise.all([
      db.company.update({
        _id: company._id,
        'members._id': user_id,
      }, {
        $set: {
          owner: user_id,
          'members.$.type': C.COMPANY_MEMBER_TYPE.OWNER,
        }
      }),
      db.company.update({
        _id: company._id,
        'members._id': req.user._id,
      }, {
        $set: {
          'members.$.type': C.COMPANY_MEMBER_TYPE.ADMIN,
        }
      })
    ])
  })
  .then(() => res.json({}))
  .catch(next);
});

api.use('/:company_id/structure', require('./structure').default);
api.use('/:company_id/member', require('./member').default);
api.use('/:company_id/project', require('./project').default);
api.use('/:company_id/announcement', require('./announcement').default);
