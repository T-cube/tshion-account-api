import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';
import config from 'config';

import { ApiError } from 'lib/error';
import { oauthCheck, authCheck } from 'lib/middleware';
import { mapObjectIdToData, fetchUserInfo } from 'lib/utils';
import { getUploadUrl } from 'lib/upload';
import C, { ENUMS } from 'lib/constants';

let api = require('express').Router();
export default api;

api.use(oauthCheck());

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
