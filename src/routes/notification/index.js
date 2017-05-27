import express from 'express'
import { ObjectId } from 'mongodb';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import { oauthCheck } from 'lib/middleware';
import { sanitizeValidateObject } from 'lib/inspector';
import { readSanitization, readValidation } from './schema';

const api = express.Router();
export default api;

api.use(oauthCheck());

api.get('/', (req, res, next) => {
  let userId = req.user._id;
  let { is_read, last_id } = req.query;
  let query = {
    to: userId,
  };
  if (is_read !== undefined) {
    query.is_read = !!parseInt(is_read);
  }
  if (!last_id !== undefined) {
    last_id = ObjectId(last_id);
  }
  req.model('notification').fetch(query, last_id)
  .then(list => res.json(list))
  .catch(next);
});

api.get('/unread-count', (req, res, next) => {
  let userId = req.user._id;
  req.model('notification').count(userId, false)
  .then(doc => res.json(doc))
  .catch(next);
});

api.post('/:notification_id/read', (req, res, next) => {
  const notification = req.model('notification');
  const id = ObjectId(req.params.notification_id);
  const userId = req.user._id;
  notification.read(userId, id)
  .then(() => notification.count(userId, false))
  .then(doc => res.json(doc))
  .catch(next);
});

api.post('/read', (req, res, next) => {
  const notification = req.model('notification');
  const userId = req.user._id;
  sanitizeValidateObject(readSanitization, readValidation, req.body);
  let { ids } = req.body;
  notification.read(userId, ids)
  .then(() => notification.count(userId, false))
  .then(doc => res.json(doc))
  .catch(next);
});

api.post('/read/all', (req, res, next) => {
  const notification = req.model('notification');
  const userId = req.user._id;
  notification.read(userId)
  .then(() => notification.count(userId, false))
  .then(doc => res.json(doc))
  .catch(next);
});
