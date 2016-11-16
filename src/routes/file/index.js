import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import moment from 'moment';
import Excel from 'exceljs';
import { Iconv } from 'iconv';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import { fileExists, timestamp, mapObjectIdToData } from 'lib/utils';
import ApprovalFlow from 'models/approval-flow';
import Attendance from 'models/attendance';
import Structure from 'models/structure';

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
    filename = encodeFilename(req, filename);
    res.set('Pragma', 'public');
    res.set('Expires', '0');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.set('Content-Disposition', 'attachment; filename=' + filename);
    res.set('Content-Type', 'text/csv; charset=GBK');
    res.send(iconv.convert(csv));
  })
  .then(() => {
    db.approval.export.remove({
      token: req.params.token
    });
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

api.get('/attendance/:token', (req, res, next) => {
  db.attendance.export.findOne({
    token: req.params.token
  })
  .then(doc => {
    if (!doc) {
      throw new ApiError(404);
    }
    let {company, department_id, year, month} = doc;
    return Promise.all([
      db.company.findOne({
        _id: company
      }),
      db.attendance.setting.findOne({
        _id: company
      })
    ])
    .then(doc => {
      let [companyInfo, setting] = doc;
      if (!setting) {
        throw new ApiError(404);
      }
      let tree = new Structure(companyInfo.structure);
      let department = tree.findNodeById(department_id);
      let members = tree.getMemberAll(department_id).map(member => member._id);
      let attendance = new Attendance(setting);
      return Promise.all([
        attendance.getDepartmentRecord(companyInfo, department_id, {year, month}),
        db.attendance.sign.find({
          user: {$in: members},
          year: year,
          month: month,
          company: companyInfo._id,
        })
      ])
      .then(doc => {
        let [summary, detail] = doc;
        let workbook = new Excel.Workbook();
        let summarySheet = workbook.addWorksheet('考勤总览', {properties:{tabColor:{argb:'DDDDDD'}}});
        let detailSheet = workbook.addWorksheet('详细记录', {properties:{tabColor:{argb:'00688B'}}});
        summarySheet.columns = [
          {
            header: '姓名',
            key: 'name',
          }, {
            header: '部门',
            key: 'department',
            width: 12,
          }, {
            header: '工作日（天）',
            key: 'workday_all',
          }, {
            header: '出勤（天）',
            key: 'workday_real',
          }, {
            header: '缺勤（天）',
            key: 'absent',
          }, {
            header: '迟到（次）',
            key: 'late',
          }, {
            header: '早退（次）',
            key: 'leave_early',
          }, {
            header: '加班（次）',
            key: 'extra_work',
          }, {
            header: '未签到（次）',
            key: 'no_sign_in',
          }, {
            header: '未签退（次）',
            key: 'no_sign_out',
          }, {
            header: '补签（次）',
            key: 'patch',
          }
        ];
        detailSheet.columns = [
          {
            header: '日期',
            key: 'date',
            style: { numFmt: 'mm/dd' }
          }, {
            header: '姓名',
            key: 'name',
          }, {
            header: '签到',
            key: 'sign_in',
            style: { numFmt: 'hh:mm' }
          }, {
            header: '签到方式',
            key: 'sign_in_method',
          }, {
            header: '签退',
            key: 'sign_out',
            style: { numFmt: 'hh:mm' }
          }, {
            header: '签退方式',
            key: 'sign_out_method',
          },
        ];
        summary.list.forEach(item => {
          item.name = item.user.name;
          item.department = department.name;
        });
        summarySheet.addRows(summary.list);
        let detailParsed = [];
        let parseRecord = (sign) => {
          return sign && (sign.from_pc ? `PC/${sign.from_pc}` : 'Weixin') + (sign.patch ? ' 补签' : '');
        };
        detail.forEach(item => {
          let username = _.find(companyInfo.members, member => member._id.equals(item.user)).name;
          _.sortBy(item.data, record => record.date).forEach(record => {
            detailParsed.push({
              date: new Date(`${year}-${month}-${record.date}`),
              name: username,
              sign_in: record.sign_in && moment(record.sign_in.time).utcOffset(0, true).toDate(),
              sign_out: record.sign_out && moment(record.sign_out.time).utcOffset(0, true).toDate(),
              sign_in_method: parseRecord(record.sign_in),
              sign_out_method: parseRecord(record.sign_out),
              sign_in_ok: record.sign_in && record.sign_in.time <= record.sign_in.setting,
              sign_out_ok: record.sign_out && record.sign_out.time >= record.sign_out.setting,
            });
          });
        });
        detailSheet.addRows(detailParsed);
        detailParsed.forEach((record, k) => {
          (detailSheet.getCell(`C${k + 2}`).font = {
            color: record.sign_in_ok ? { argb: '006400' } : { argb: 'FFB90F'},
          });
          (detailSheet.getCell(`E${k + 2}`).font = {
            color: record.sign_out_ok ? { argb: '006400' } : { argb: 'FFB90F'},
          });
        });

        let filename = encodeFilename(req, `考勤（${department.name}）-${year}.${month}.xlsx`);
        res.set('Pragma', 'public');
        res.set('Expires', '0');
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        res.set('Content-Disposition', 'attachment; filename=' + filename);
        res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=GBK');
        workbook.xlsx.write(res);
      });
    });
  })
  .then(() => {
    db.attendance.export.remove({
      token: req.params.token
    });
  })
  .catch(next);
});

function encodeFilename(req, filename) {
  let isFirefox = req.get('User-Agent').toLowerCase().indexOf('firefox') > -1;
  if (isFirefox) {
    filename = '=?UTF-8?B?' + new Buffer(filename).toString('base64') + '?=';
  } else {
    filename = encodeURIComponent(filename);
  }
  return filename;
}
