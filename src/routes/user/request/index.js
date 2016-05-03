import express from 'express'
import { ObjectId } from 'mongodb';

import { ApiError } from 'lib/error';
import { oauthCheck } from 'lib/middleware';
import upload from 'lib/upload';

import { sanitizeValidateObject } from 'lib/inspector';
import { infoSanitization, infoValidation, avatarSanitization, avatarValidation } from './schema';

/* users collection */
let api = express.Router();
export default api;

api.get('/inbox/', (req, res, next) => {
  db.request.findOne({
    to: req.user._id
  })
  .then(list => {
    res.json(list);
  });
});

api.get('/outbox/', (req, res, next) => {
  db.request.findOne({
    to: req.user._id
  })
  .then(list => {
    res.json(list);
  });
});

api.put('/inbox/:request_id/accept', (req, res, next) => {

});
