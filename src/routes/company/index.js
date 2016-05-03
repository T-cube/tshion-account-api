import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';

import upload, { randomAvatar } from 'lib/upload';
import C from 'lib/constants';
import { ApiError } from 'lib/error';
import { oauthCheck, authCheck } from 'lib/middleware';
import { time } from 'lib/utils';
import { userId, userInfo } from 'lib/utils';
import { sanitizeValidateObject } from 'lib/inspector';
import { companySanitization, companyValidation } from './schema';

/* company collection */
let api = require('express').Router();
export default api;

api.use(oauthCheck());

// Get company list
api.get('/', (req, res, next) => {
  db.user.findOne({
    _id: req.user._id
  }, {
    companies: 1
  })
  .then(user => {
    let companies = user.companies || [];
    return db.company.find({
      _id: { $in: companies }
    }, {
      name: 1,
      description: 1,
      logo: 1,
    });
  })
  .then(list => res.json(list))
  .catch(next);
});

// Add new company
api.post('/', (req, res, next) => {
  let data = req.body; // contains name, description only

  sanitizeValidateObject(companySanitization, companyValidation, data);
  // get owner data
  db.user.findOne({
    _id: req.user._id
  }, {
    name: 1, email: 1, mobile: 1, birthdate: 1, sex: 1,
  })
  .then(member => {
    console.log(member);
    // compose default data structure
    let position_id = ObjectId();
    _.extend(member, {
      joindate: time(),
      status: C.COMPANY_MEMBER_STATUS.NORMAL,
      type: C.COMPANY_MEMBER_TYPE.OWNER,
    });
    _.extend(data, {
      owner: member._id,
      members: [member],
      logo: randomAvatar('company', 10),
      structure: {
        _id: ObjectId(),
        name: data.name,
        positions: [{
          _id: position_id,
          title: __('administrator'),
        }],
        members: [{
          _id: member._id,
          title: position_id,
        }],
        children: [],
      },
      projects: [],
    });
    // add company to user
    return db.company.insert(data);
  })
  .then(doc => {
    console.log(doc);
    return db.user.update({
      _id: req.user._id
    }, {
      $push: { companies: doc._id }
    })
    .then(() => res.json(doc));
  })
  .catch(next);
});

api.param('company_id', (req, res, next, id) => {
  let company_id = ObjectId(id);
  db.company.findOne({
    _id: company_id,
    'members._id': req.user._id,
  })
  .then(company => {
    if (!company) {
      throw new ApiError(404, null, 'company not found');
    }
    req.company = company;
    next();
  })
  .catch(next);
});

// Get company detail
api.get('/:company_id', (req, res, next) => {
  res.json(req.company);
});

api.put('/:company_id', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(companySanitization, companyValidation, data);

  db.company.update(
    {_id: ObjectId(req.params.company_id)},
    {$set: data}
  )
  .then(doc => res.json(doc))
  .catch(next);
});

api.delete('/:company_id', authCheck(), (req, res, next) => {
  let user_id = ObjectId(req.body.user_id);
  let company = req.company;
  if (!req.user._id.equals(company.owner)) {
    throw new ApiError(403, null, 'only owner can carry out this operation');
  }
  // TODO remove related resources
  db.company.remove({
    _id: company._id
  })
  .then(doc => res.json({}))
  .catch(next);
});

api.put('/:company_id/logo', upload({type: 'avatar'}).single('logo'),
(req, res, next) => {
  if (!req.file) {
    throw new ApiError(400, null, 'file type not allowed');
  }
  let data = {
    logo: req.file.url
  };
  db.company.update({
    _id: req.company._id
  }, {
    $set: data
  })
  .then(() => res.json(data))
  .catch(next);
});

api.post('/:company_id/transfer', authCheck(), (req, res, next) => {
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
