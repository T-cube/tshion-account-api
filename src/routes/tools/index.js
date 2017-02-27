import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';
import config from 'config';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import { oauthCheck, authCheck } from 'lib/middleware';
import { mapObjectIdToData, fetchUserInfo, generateToken } from 'lib/utils';
import { getUploadUrl } from 'lib/upload';
import C, { ENUMS } from 'lib/constants';

let api = require('express').Router();
export default api;

// api.use(oauthCheck());

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
  let captcha = req.model('canvas-captcha');
  let username = req.query.username;
  let client_id = req.query.client_id;
  let captchaToken = req.query.captchaToken;
  let captchaKey = `${username}_${client_id}`;
  let redis = req.model('redis');
  redis.hmget(captchaKey).then(captchaData => {
    if(captchaData){
      if(captchaToken !== captchaData.captchaToken) {
        generateToken(48).then(newCaptchaToken => {
          redis.hmset(captchaKey, {times: parseInt(captchaData.times)+1, captchaToken: newCaptchaToken}).then(() => {
            redis.expire(captchaKey, 60 * 60);
            throw new ApiError(400, 'missing_or_wrong_captcha_token', newCaptchaToken);
          }).catch(next);
        });
      }else {
        captcha.create().then(captchaContent => {
          redis.hmset(captchaKey, {captcha: captchaContent.captcha}).then(() => {
            redis.expire(captchaKey, 60 * 60);
            return res.send({captcha: captchaContent.canvas});
          });
        });
      }
    }else {
      throw new ApiError(400, 'no_need_captcha');
    }
  })
  .catch(next);
});
