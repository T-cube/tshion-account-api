import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';

import { ApiError } from 'lib/error';
import { time } from 'lib/utils';
import inspector from 'lib/inspector';
import Structure from 'models/structure';
import { sanitization, validation } from './schema';
import { oauthCheck } from 'lib/middleware';
import C from 'lib/constants';

/* company collection */
let api = require('express').Router();
export default api;

api.use(oauthCheck());

api.use((req, res, next) => {
  next();
});

api.get('/notice', (req, res, next) => {
  db.announcement.find({
    company_id: req.company._id,
    type: C.ANNOUNCEMENT_TYPE.NOTICE,
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.get('/news', (req, res, next) => {
  db.announcement.find({
    company_id: req.company._id,
    type: C.ANNOUNCEMENT_TYPE.NEWS,
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
    throw new ApiError(400, null, result.error);
  }

  // validation of members and structure nodes
  let structure = new Structure(req.company.structure);
  data.from.creator = req.user._id;
  if (!structure.findNodeById(data.from.department)) {
    throw new ApiError(400, null, 'from department is not exists');
  }
  data.to.department.forEach(i => {
    if (!structure.findNodeById(i)) {
      throw new ApiError(400, null, 'to department: ' + i  + ' is not exists');
    }
  });
  let memberIds = req.company.members.map(i => i._id);
  data.to.member.forEach(each => {
    if (-1 == indexObjectId(memberIds, each)) {
      throw new ApiError(400, null, 'to member: ' + each + ' is not exists');
    }
  });

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
