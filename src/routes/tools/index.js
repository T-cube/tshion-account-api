import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';
import config from 'config';
import { validate } from './schema';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import { oauthCheck, authCheck } from 'lib/middleware';
import { mapObjectIdToData, fetchUserInfo, generateToken } from 'lib/utils';
import { getUploadUrl } from 'lib/upload';
import C, { ENUMS } from 'lib/constants';

let api = require('express').Router();
export default api;

// api.use(oauthCheck());

const attemptTimes = config.get('vendor.attemptTimes');


api.get('/avatar-list/:type', (req, res, next) => {
  let type = req.params.type;
  if (!_.contains(['company', 'project', 'user'], type)) {
    throw new ApiError(404, null, 'invalid avatar type');
  }
  let dir = `system/avatar/${type}`;
  let count = config.get(`avatar.count.${type}`);
  console.log(count);
  let list = [];
  for (let i = 1; i <= count; i++) {
    let num = ('0' + i).slice(-2);
    let filename = `${num}.png`;
    let url = getUploadUrl(dir, filename);
    list.push(url);
  }
  res.json(list);
});

api.get('/captcha', (req, res, next) => {
  let { username, captchaType } = req.query;
  validate('captcha', {username, captchaType});
  let captcha = req.model('captcha');
  let redis = req.model('redis');
  let userCaptcha = `${username}_${captchaType}_captcha`;
  let userKey = `${username}_error_times`;
  redis.get(userKey).then(times => {
    if (times > attemptTimes.userCaptchaTimes - 1) {
      captcha.request(userCaptcha, redis).then(canvasURL => {
        res.send(canvasURL);
      });
    } else {
      throw new ApiError(400, 'no_need_captcha');
    }
  });
});
