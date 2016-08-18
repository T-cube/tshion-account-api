import express from 'express';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import config from 'config';
import moment from 'moment';
import { Iconv } from 'iconv';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import { fileExists, timestamp, mapObjectIdToData } from 'lib/utils';
import ApprovalFlow from 'models/approval-flow';


let api = express.Router();
export default api;

function getFileInfo(fileId, token) {
  return db.document.token.findOne({
    file: fileId,
    token: token,
  })
  .then(doc => {
    if (!doc) {
      throw new ApiError(403);
    } else if (doc.expires < timestamp()) {
      throw new ApiError(401, 'token_expired');
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

// TODO remove this interface, use CDN download url instead
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
        res.set('Content-Disposition', 'attachment; filename=' + filename);
        res.set('Content-Type', fileInfo.mimetype);
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
  .then(file => {
    const apiUrl = config.get('apiUrl');
    const qiniu = req.model('qiniu').getInstance('cdn-file');
    let data = {
      file: file,
      downloadUrl: qiniu.makeLink(file.url, file.name),
      previewUrl: `${apiUrl}api/file/preview/doc/${fileId}/token/${token}`,
    };
    res.render('file/preview', data);
  })
  .catch(next);
});

api.get('/preview/doc/:file_id/token/:token', (req, res, next) => {
  let fileId = ObjectId(req.params.file_id);
  const { file_id, token } = req.params;
  getFileInfo(fileId, token)
  .then(file => {
    const apiUrl = config.get('apiUrl');
    const qiniu = req.model('qiniu').getInstance('cdn-file');
    let downloadUrl = qiniu.makeLink(file.url, file.name);
    let options = {
      enableSSL: /^https/.test(apiUrl),
    };
    let cryptedUrl = req.model('ow365').getPreviewUrl(downloadUrl, options);
    // res.send(cryptedUrl);
    res.redirect(cryptedUrl);
  })
  .catch(next);
});

api.get('/approval/:token', (req, res, next) => {
  let filename;
  db.approval.export.findOne({
    token: req.params.token
  })
  .then(exportApproval => {
    if (!exportApproval) {
      throw new ApiError(404);
    }
    return mapObjectIdToData(exportApproval, [
      ['company', 'members', 'company'],
      ['approval.template', 'name', 'query.template'],
    ]);
  })
  .then(info => {
    filename = generateApprovalFileName(info);
    info.query.template = info.query.template._id;
    return new ApprovalFlow({
      company: info.company,
      user_id: info.user,
      type: info.type,
      query: info.query,
      forDownload: true
    })
    .findItems();
  })
  .then(csv => {
    let iconv = new Iconv('UTF-8', 'GBK');
    let isFirefox = req.get('User-Agent').toLowerCase().indexOf('firefox') > -1;
    if (isFirefox) {
      filename = '=?UTF-8?B?' + new Buffer(filename).toString('base64') + '?=';
    } else {
      filename = encodeURIComponent(filename);
    }
    res.set('Pragma', 'public');
    res.set('Expires', '0');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.set('Content-Disposition', 'attachment; filename=' + filename);
    res.set('Content-Type', 'text/csv; charset=GBK');
    res.send(iconv.convert(csv));
  })
  .catch(next);
});

function generateApprovalFileName({type, query}) {
  let datetime = moment();
  let typeTxt = {
    approve: '我的审批',
    apply: '我的申请',
    copyto: '抄送给我',
  };
  let pageTxt;
  switch (query.export_count) {
  case 'this_month':
    pageTxt = (datetime.month() + 1) + '月';
    break;
  case 'last_month':
    pageTxt = datetime.month() + '月';
    break;
  case 'all':
    pageTxt = '全部';
    break;
  case 'page':
    query.page = query.page || 1;
    pageTxt = `第${query.page}页`;
    break;
  }
  datetime = datetime.format('M月D日');
  let filename = `审批-${typeTxt[type]}-${query.template.name}-${pageTxt}-${datetime}导出.csv`;
  return filename;
}
