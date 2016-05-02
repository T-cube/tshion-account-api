import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';

import { ApiError } from 'lib/error';
import { sanitizeValidateObject } from 'lib/inspector';
import { sanitization, validation, commentSanitization, commentValidation, logSanitization, logValidation } from './schema';
import C, { ENUMS } from 'lib/constants';
import { oauthCheck } from 'lib/middleware';


let api = require('express').Router();
export default api;

api.use(oauthCheck());

api.use((req, res, next) => {
  next();
});


api.get('/item', (req, res, next) => {
  db.application.find({
    company_id: rqeq.company._id
  })
  .then(data => res.json(data || []))
  .catch(next);
})

api.post('/item', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(sanitization, validation, data);
  _.extend(data, {
    creator: req.user._id,
    followers: [req.user._id],
    company_id: req.company._id,
    project_id: req.project_id,
    time_create: new Date()
  });

});

api.get('/item/:application_id', (req, res, next) => {
  
});

A