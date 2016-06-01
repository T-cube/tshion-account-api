import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';
import fs from 'fs';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import { oauthCheck, authCheck } from 'lib/middleware';
import { timestamp } from 'lib/utils';

let api = express.Router();
export default api;

// api.use(oauthCheck());

api.get('/file/:file_id/token/:token', (req, res, next) => {
  let file_id = ObjectId(req.params.file_id);
  db.document.token.findOne({
    file: file_id,
    token: req.params.token,
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
      let filename = encodeURIComponent(fileInfo.name);
      res.set('Content-disposition', 'attachment; filename=*=UTF-8\'\'' + filename);
      res.set('Content-type', fileInfo.mimetype);
      if (fileInfo.path) {
        fs.createReadStream(fileInfo.path).pipe(res);
      } else if (fileInfo.content) {
        res.send(fileInfo.content);
      } else {
        throw new ApiError(404);
      }
    } catch (e) {
      throw new ApiError(500);
    }
  })
  .catch(next)
});
