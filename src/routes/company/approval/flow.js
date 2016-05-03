import _ from 'underscore';
import express from 'express';
import { oauthCheck } from 'lib/middleware';

let api = require('express').Router();
export default api;

api.get('/apply', (req, res, next) => {
  db.approval.flow.findOne({
    _id: req.user._id,
    company_id: req.company._id
  }, {
    apply: 1
  })
  .then(doc => {
    return db.approval.user.find({
      _id: {
        $in: doc.applay
      }
    })
  })
  .then(data => res.json(data || []))
  .catch(next);
});

api.get('/approve', (req, res, next) => {
  db.approval.flow.findOne({
    _id: req.user._id,
    company_id: req.company._id
  }, {
    approve: 1
  })
  .then(doc => {
    return db.approval.user.find({
      _id: {
        $in: doc.approve
      }
    })
  })
  .then(data => res.json(data || []))
  .catch(next);
});

api.get('/copyto', (req, res, next) => {
  db.approval.flow.findOne({
    _id: req.user._id,
    company_id: req.company._id
  }, {
    copyto: 1
  })
  .then(doc => {
    return db.approval.user.find({
      _id: {
        $in: doc.copyto
      }
    })
  })
  .then(data => res.json(data || []))
  .catch(next);
});
