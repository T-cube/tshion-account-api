import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';

import { ApiError } from 'lib/error';
import { sanitizeValidateObject } from 'lib/inspector';
import { sanitization, validation, statusSanitization, statusValidation } from './schema';
import C from 'lib/constants';
import { oauthCheck } from 'lib/middleware';
import Structure from 'models/structure';

let api = require('express').Router();
export default api;

api.use(oauthCheck());

api.get('/', (req, res, next) => {
  let condition = {
    company_id: req.company._id,
    status: {
      $ne: C.APPROVAL_STATUS.DELETED
    },
  };
  let scope = req.query.scope;
  scope = scope && ObjectId.isValid(scope)
    ? ObjectId(scope)
    : null;
  scope && (condition.scope = scope);
  db.approval.template.find(condition, {
    name: 1,
    description: 1,
    scope: 1,
    status: 1,
  })
  .then(data => {
    let tree = new Structure(req.company.structure);
    data.forEach(item => {
      if (item.scope) {
        item.scope = item.scope.map(scope => tree.findNodeById(scope));
      }
    });
    res.json(data);
  })
  .catch(next);
});

api.post('/', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(sanitization, validation, data);
  data.steps.map(i => {
    i._id = ObjectId();
    return i;
  });
  data.forms && data.forms.map(i => {
    i._id = ObjectId();
    return i;
  });
  data.company_id = req.company._id;
  data.status = C.APPROVAL_STATUS.UNUSED;
  db.approval.template.insert(data)
  .then(doc => res.json(doc))
  .catch(next);
});

api.put('/:template_id', (req, res, next) => {
  let data = req.body;
  let template_id = ObjectId(req.params.template_id);
  sanitizeValidateObject(sanitization, validation, data);
  db.approval.template.update({
    _id: template_id,
    company_id: req.company._id,
    status: {
      $ne: C.APPROVAL_STATUS.DELETED
    }
  }, {
    $set: data
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.get('/:template_id', (req, res, next) => {
  let template_id = ObjectId(req.params.template_id);
  db.approval.template.findOne({
    _id: template_id,
    company_id: req.company._id,
    status: {
      $ne: C.APPROVAL_STATUS.DELETED
    }
  })
  .then(doc => {
    if (!doc) {
      throw new ApiError(404)
    }
    let tree = new Structure(req.company.structure);
    doc.scope.map(scope => tree.findNodeById(scope));
    res.json(doc)
  })
  .catch(next);
});

api.put('/:template_id/status', (req, res, next) => {
  let data = req.body;
  let template_id = ObjectId(req.params.template_id);
  sanitizeValidateObject(statusSanitization, statusValidation, data);
  db.approval.template.update({
    _id: template_id,
    company_id: req.company._id,
    status: {
      $ne: C.APPROVAL_STATUS.DELETED
    }
  }, {
    $set: data
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.delete('/:template_id', (req, res, next) => {
  let template_id = ObjectId(req.params.template_id);
  db.approval.template.update({
    _id: template_id,
    company_id: req.company._id
  }, {
    $set: {
      status: C.APPROVAL_STATUS.DELETED
    }
  })
  .then(() => res.json({}))
  .catch(next);
});
