import _ from 'underscore';
import express from 'express';
import config from 'config';
import { ObjectId } from 'mongodb';
import qs from 'qs';

import db from 'lib/database';
import { time, timestamp, comparePassword, hashPassword, generateToken, getEmailName } from 'lib/utils';
import { ApiError } from 'lib/error';
import { oauthCheck } from 'lib/middleware';
import C from 'lib/constants';
import { sanitizeValidateObject } from 'lib/inspector';

let api = express.Router();
export default api;

api.get('/info', oauthCheck(), (req, res, next) => {
  const user = req.user;
  console.log(user);
  let data = {
    id: user._id,
    email: user.email,
    name: user.name,
  };
  res.json(data);
});

api.get('/user-avatar/:user_id', (req, res, next) => {
  const userId = ObjectId(req.params.user_id);
  db.user.findOne({_id: userId}, {avatar: 1})
  .then(user => {
    if (!user) {
      throw new ApiError(404);
    }
    res.redirect(user.avatar + '?' + qs.stringify(req.query));
  })
  .catch(next);
});
