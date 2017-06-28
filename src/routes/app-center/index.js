import express from 'express';
import db from 'lib/database';
import C from 'lib/constants';

import { validate } from './schema';

let api = express.Router();
export default api;

api.get('/app', (req, res, next) => {
  validate('list', req.query);
  let { page, pagesize, type } = req.query;
  let sort;
  if (type == C.APP_LIST_TYPE.ALL) {
    sort = { _id: -1 };
  } else if (C.APP_LIST_TYPE.TOP) {
    sort = { star: -1 };
  } else {
    sort = { date_update: -1 };
  }
  db.app.find({}, {
    _id: 1,
    name: 1,
    appid: 1,
    icons: 1,
    version: 1,
    star: 1,
    description: 1,
    author: 1
  })
  .sort(sort)
  .skip((page - 1) * pagesize)
  .limit(pagesize)
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
