import _ from 'underscore';
import express from 'express';
import config from 'config';

import db from 'lib/database';
import { time, timestamp, comparePassword, hashPassword, generateToken, getEmailName } from 'lib/utils';
import { ApiError } from 'lib/error';
import { oauthCheck } from 'lib/middleware';
import C from 'lib/constants';
import { sanitizeValidateObject } from 'lib/inspector';

let api = express.Router();
export default api;

api.use(oauthCheck());

api.get('/info', (req, res, next) => {
  const user = req.user;
  let data = {
    id: user._id,
    email: user.email,
    avatar: user.avatar,
    name: user.name,
  };
  res.json(data);
});
