import express from 'express';
import { ObjectId } from 'mongodb';
import fs from 'fs';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import { fileExists, timestamp } from 'lib/utils';
import config from 'config';

let api = express.Router();
export default api;

function getFileInfo(fileId, token) {
  return db.document.token.findOne({
    file: fileId,
    token: token,
  })
  .then(doc => {
    if (!doc || doc.tokenExpires < timestamp()) {
      throw new ApiError(401);
    }
    return db.document.file.findOne({
      _id: fileId,
    });
  })
  .then(fileInfo => {
    if (!fileInfo) {
      throw new ApiError(404);
    }
    return fileInfo;
  });
}

api.get('/download/:file_id/token/:token', (req, res, next) => {
  let fileId = ObjectId(req.params.file_id);
  let token = req.params.token;
  getFileInfo(fileId, token)
  .then(fileInfo => {
    if (fileInfo.path) {
      return fileExists(fileInfo.path)
      .then(exists => {
        if (!exists) {
          throw new ApiError(404);
        }
        let filename = fileInfo.name;
        let isFirefox = req.get('User-Agent').toLowerCase().indexOf('firefox') > -1;
        if (isFirefox) {
          filename = '=?UTF-8?B?' + new Buffer(filename).toString('base64') + '?=';
        } else {
          filename = encodeURIComponent(filename);
        }
        res.set('Content-disposition', 'attachment; filename=' + filename);
        res.set('Content-type', fileInfo.mimetype);
        fs.createReadStream(fileInfo.path).pipe(res);
      });
    } else if (fileInfo.content) {
      res.send(fileInfo.content);
    } else {
      throw new ApiError(404);
    }
  })
  .catch(next);
});

api.get('/preview/:file_id/token/:token', (req, res, next) => {
  let fileId = ObjectId(req.params.file_id);
  const { file_id, token } = req.params;
  getFileInfo(fileId, token)
  .then(fileInfo => {
    const apiUrl = config.get('apiUrl');
    let data = {
      file: fileInfo,
      previewUrl: `${apiUrl}api/file/preview/doc/${fileId}/token/${token}`,
    };
    console.log(fileInfo);
    res.render('file/preview', data);
  })
  .catch(next);
});

api.get('/preview/doc/:file_id/token/:token', (req, res, next) => {
  let fileId = ObjectId(req.params.file_id);
  const { file_id, token } = req.params;
  getFileInfo(fileId, token)
  .then(fileInfo => {
    const apiUrl = config.get('apiUrl');
    let downloadUrl = `${apiUrl}api/file/download/${fileId}/token/${token}`;
    let options = {
      enableSSL: /^https/.test(apiUrl),
    };
    let cryptedUrl = req.model('ow365').getPreviewUrl(downloadUrl, options);
    res.send(cryptedUrl);
    // res.redirect(cryptedUrl);
  })
  .catch(next);
});
