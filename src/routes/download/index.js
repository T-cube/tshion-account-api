import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';
import fs from 'fs';
import stream from 'stream';

import { ApiError } from 'lib/error';
import { oauthCheck, authCheck } from 'lib/middleware';
import { timestamp } from 'lib/utils';
import { getUploadPath } from 'lib/upload';

let api = require('express').Router();
export default api;

// api.use(oauthCheck());

api.get('/file/:file_id/token/:token', (req, res, next) => {
  let file_id = ObjectId(req.params.file_id);
  db.document.token.findOne({
    file: file_id,
    token: req.params.token
  })
  .then(doc => {
    if (!doc || doc.tokenExpires < timestamp()) {
      throw new ApiError(401);
    }
    return db.document.file.findOne({
      _id: file_id,
    })
  })
  .then(fileInfo => {
    if (!fileInfo) {
      throw new ApiError(404);
    }
    try {
      if (fileInfo.path) {
        res.set('Content-disposition', 'attachment; filename=' + fileInfo.name);
        res.set('Content-type', fileInfo.mimetype);
        fs.createReadStream(getUploadPath(fileInfo.path)).pipe(res);
      } else if (fileInfo.content) {
        let s = new stream.Readable();
        s._read = function noop() {};
        s.push(fileInfo.content);
        s.push(null);
        res.set('Content-disposition', 'attachment; filename=' + fileInfo.name);
        res.set('Content-type', 'text/plain');
        s.pipe(res);
      }
    } catch (e) {
      throw new ApiError(500, null, 'can not download file')
    }
  })
  .catch(next)
});
