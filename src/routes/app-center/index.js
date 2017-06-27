import express from 'express';
import db from 'lib/database';

import { validate } from './schema';

let api = express.Router();
export default api;

api.get('/app', (req, res, next) => {
  db.app.find({}, {
    _id: 1,
    name: 1,
    appid: 1,
    icons: 1,
    version: 1,
    description: 1,
    author: 1
  })
  .then(list => {
    res.json(list);
  })
  .catch(next);
});

api.get('/app/:appid', (req, res, next) => {
  validate('appRequest', req.params);
  let { appid } = req.params;
  db.app.findOne({ appid: appid }, { metadata: 0 }).then(doc => {
    res.json(doc);
  })
  .catch(next);
});
