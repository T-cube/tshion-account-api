import _ from 'underscore';
import express from 'express';
import { oauthCheck } from 'lib/middleware';

let api = require('express').Router();
export default api;

api.get('/apply', (req, res, next) => {
  findItems(req, 'apply')
});

api.get('/approve', (req, res, next) => {
  findItems(req, 'approve')
});

api.get('/copyto', (req, res, next) => {
  findItems(req, 'copyto')
});

function findItems(req, type) {
  if (-1 == ['apply', 'approve', 'copyto'].indexOf(type)) {}
  return db.approval.flow.findOne({
    _id: req.user._id,
    company_id: req.company._id
  }, {
    [type]: 1
  })
  .then(doc => {
    return db.approval.user.find({
      _id: {
        $in: doc[type]
      }
    })
  })
  .then(data => res.json(data || []))
  .catch(next);
}
