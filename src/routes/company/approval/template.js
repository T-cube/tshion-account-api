import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';

import { ApiError } from 'lib/error';
import { sanitizeValidateObject } from 'lib/inspector';
import { sanitization, validation, statusSanitization, statusValidation } from './schema';
import C, { ENUMS } from 'lib/constants';
import { oauthCheck } from 'lib/middleware';

let api = require('express').Router();
export default api;

api.use(oauthCheck());

api.get('/', (req, res, next) => {
  db.approval.find({
    company_id: req.company._id
  })
  .then(data => res.json(data || []))
  .catch(next);
})

api.post('/', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(sanitization, validation, data);
  data.steps.map(i => {
    i._id = ObjectId();
    return i;
  });
  data.forms.map(i => {
    i._id = ObjectId();
    return i;
  });
  data.company_id = req.company._id;
  data.status = C.APPROVAL_STATUS.NORMAL;
  db.approval.insert(data)
  .then(doc => res.json(doc))
  .catch(next);
});

api.put('/:template_id', (req, res, next) => {
  let data = req.body;
  let template_id = ObjectId(req.params.template_id);
  sanitizeValidateObject(sanitization, validation, data);
  db.approval.update({
    _id: template_id,
    company_id: req.company._id
  }, {
    $set: data
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.get('/:template_id', (req, res, next) => {
  let template_id = ObjectId(req.params.template_id);
  db.approval.findOne({
    _id: template_id,
    company_id: req.company._id
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.put('/:template_id/status', (req, res, next) => {
  let data = req.body;
  let template_id = ObjectId(req.params.template_id);
  sanitizeValidateObject(statusSanitization, statusValidation, data);
  db.approval.update({
    _id: template_id,
    company_id: req.company._id
  }, {
    $set: data
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.delete('/:template_id', (req, res, next) => {
  let template_id = ObjectId(req.params.template_id);
  db.approval.remove({
    _id: template_id,
    company_id: req.company._id
  })
  .then(() => res.json({}))
  .catch(next);
});
