import express from 'express';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import config from 'config';
import moment from 'moment';
import Excel from 'exceljs';
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
  .then(file => {
    if (!file) {
      throw new ApiError(404);
    }
    return file;
  });
}

// TODO remove this interface, use CDN download url instead
api.get('/download/:file_id/token/:token', (req, res, next) => {
  let fileId = ObjectId(req.params.file_id);
  let token = req.params.token;
  getFileInfo(fileId, token)
  .then(file => {
    if (file.path) {
      return fileExists(file.path)
      .then(exists => {
        if (!exists) {
          throw new ApiError(404);
        }
        setFileDownloadHeader(req, res, file);
        fs.createReadStream(file.path).pipe(res);
      });
    } else if (file.content) {
      setFileDownloadHeader(req, res, file);
      req.model('html-helper').prepare(file.content)
      .then(content => {
        res.send(content);
      });
    } else {
      throw new ApiError(404);
    }
  })
  .catch(next);
});

function setFileDownloadHeader(req, res, file) {
  let filename = file.name;
  let isFirefox = req.get('User-Agent').toLowerCase().indexOf('firefox') > -1;
  if (isFirefox) {
    filename = '=?UTF-8?B?' + new Buffer(filename).toString('base64') + '?=';
  } else {
    filename = encodeURIComponent(filename);
  }
  res.set('Content-Disposition', 'attachment; filename=' + filename);
  res.set('Content-Type', file.mimetype);
}

api.get('/preview/:file_id/token/:token', (req, res, next) => {
  let fileId = ObjectId(req.params.file_id);
  const { token } = req.params;
  getFileInfo(fileId, token)
  .then(file => {
    const qiniu = req.model('qiniu').bucket('cdn-file');
    let data = {
      file: file,
    };
    return qiniu.makeLink(file.cdn_key, file.name)
    .then(link => {
      data.download_url = link;
      let options = {
        enableSSL: /^https/.test(link),
      };
      data.preview_url = req.model('ow365').getPreviewUrl(link, options);
      res.render('file/preview', data);
    });
  })
  .catch(next);
});

api.get('/preview/doc/:file_id/token/:token', (req, res, next) => {
  let fileId = ObjectId(req.params.file_id);
  const { token } = req.params;
  getFileInfo(fileId, token)
  .then(file => {
    const qiniu = req.model('qiniu').bucket('cdn-file');
    return qiniu.makeLink(file.url)
    .then(link => {
      let options = {
        enableSSL: /^https/.test(link),
      };
      let preview_url = req.model('ow365').getPreviewUrl(link, options);
      res.redirect(preview_url);
    });
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
      ['company', 'members', 'company']
    ]);
  })
  .then(info => {
    let approvalFlow = new ApprovalFlow({
      company: info.company,
      user_id: info.user,
      type: info.type,
      query: info.query,
      forDownload: true
    });
    return approvalFlow.findItems()
    .then(data => {
      filename = generateApprovalFileName(info, data.list && data.list[0] && data.list[0].template.name);
      return approvalFlow.wrapCsvData(data);
    });
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

function generateApprovalFileName({type, query}, tplName) {
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
  default:
    pageTxt = '';
  }
  datetime = datetime.format('M月D日');
  let filename = `审批-${typeTxt[type]}-${tplName}-${pageTxt}-${datetime}导出.csv`;
  return filename;
}

// api.get('/attendance/:token', (req, res, next) => {
//   db.attendance.export.findOne({
//     token: req.params.token
//   })
//   .then(exportAttend => {
//     if (!exportAttend) {
//       throw new ApiError(404);
//     }
//     let {
//       company,
//       department_id,
//     } = exportAttend;
//     // let workbook = new Excel.Workbook();
//     // let sheet = workbook.addWorksheet('My Sheet', {properties:{tabColor:{argb:'FFC0000'}}});
//
//   })
//   .catch(next);
// });
