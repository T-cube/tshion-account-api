import express from 'express';
import { ObjectId } from 'mongodb';
import _ from 'underscore';
import { upload, saveCdn } from 'lib/upload';
import { ApiError } from 'lib/error';
import moment from 'moment';

import { validate } from './schema';
import C from './constants';

let api = express.Router();
export default api;

api.get('/overview', (req, res, next) => {
  req._app.getStructure(req.company.structure, req.user._id).then(memberDepartments => {
    req._app.overview({
      company_id: req.company._id,
      user_id: req.user._id,
      memberDepartments
    }).then(doc => {
      res.json(doc);
    }).catch(next);
  }).catch(next);
});

api.get('/report', (req, res, next) => {
  validate('list', req.query);
  let { page, type, pagesize, status, start_date, end_date, reporter, report_target, report_type } = req.query;
  req._app.getStructure(req.company.structure, req.user._id).then(memberDepartments => {
    if (type == C.BOX_TYPE.INBOX) {
      if (report_target) {
        if (!_.some(memberDepartments, item => item.equals(report_target))) {
          throw new ApiError(400, 'report_target_error');
        }
      } else {
        report_target = memberDepartments;
      }
    }
    if (start_date) {
      start_date = moment(start_date).startOf('day').toDate()
    }
    if (end_date) {
      end_date = moment(end_date).startOf('day').toDate()
    }
    req._app.list({
      user_id: req.user._id,
      company_id: req.company._id,
      page,
      pagesize,
      type,
      status,
      start_date,
      end_date,
      reporter,
      report_type,
      report_target
    })
    .then(list => {
      res.json(list);
    }).catch(next);
  }).catch(next);
});

api.get('/month/report', (req, res, next) => {
  validate('month', req.query);
  let { type, report_target, report_type } = req.query;
  // let start_date = moment().year(year).month(month-1).startOf('month').toDate();
  // let end_date = moment().year(year).month(month-1).endOf('month').toDate();
  req._app.getStructure(req.company.structure, req.user._id).then(memberDepartments => {
    let is_copyto = false;
    if (type == C.BOX_TYPE.INBOX) {
      if (!_.some(memberDepartments, item => item.equals(report_target))) {
        is_copyto = true;
      }
    }
    req._app.month({
      user_id: req.user._id,
      company_id: req.company._id,
      is_copyto,
      type,
      // start_date,
      // end_date,
      report_target,
      report_type
    })
    .then(list => {
      res.json(list);
    })
    .catch(next);
  })
  .catch(next);
});

api.get('/report/:report_id', (req, res, next) => {
  validate('info', req.params, ['report_id']);
  validate('list', req.query);
  let { page, type, pagesize, status, start_date, end_date, reporter, report_target, report_type } = req.query;
  let { report_id } = req.params;
  req._app.getStructure(req.company.structure, req.user._id).then(memberDepartments => {
    if (type == C.BOX_TYPE.INBOX) {
      if (report_target) {
        if (!_.some(memberDepartments, item => item.equals(report_target))) {
          throw new ApiError(400, 'report_target_error');
        }
      } else {
        report_target = memberDepartments;
      }
    }
    if (start_date) {
      start_date = moment(start_date).startOf('day').toDate()
    }
    if (end_date) {
      end_date = moment(end_date).startOf('day').toDate()
    }
    req._app.detail({
      user_id: req.user._id,
      company_id: req.company._id,
      page,
      pagesize,
      type,
      status,
      start_date,
      end_date,
      reporter,
      report_type,
      report_target,
      report_id
    }).then(doc => {
      res.json(doc);
    }).catch(next);
  }).catch(next);
});

// TODO: may write a common api for user to upload their attachment in their apps

api.post('/upload',
upload({type: 'attachment'}).single('document'),
saveCdn('cdn-file'),
(req, res, next) => {
  let file = req.file;
  if (!file) {
    throw new ApiError(400, 'file_not_upload');
  }
  let user_id = req.user._id;
  let company_id = req.company._id;
  req._app.uploadSave(file, user_id, company_id).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.post('/report', (req, res, next) => {
  validate('report', req.body);
  req._app.report({
    user_id: req.user._id,
    company_id: req.company._id,
    report: req.body
  }).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.put('/report/:report_id', (req, res, next) => {
  validate('change', req.body);
  validate('info', req.params, ['report_id']);
  let { report_id } = req.params;
  req._app.reportUpdate({
    user_id: req.user._id,
    report_id,
    report: req.body
  }).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.post('/report/:report_id/mark', (req, res, next) => {
  validate('info', req.params, ['report_id']);
  validate('info', req.body, ['status', 'content']);
  let { report_id } = req.params;
  let { status, content } = req.body;
  req._app.getStructure(req.company.structure, req.user._id).then(memberDepartments => {
    req._app.mark({
      user_id: req.user._id,
      report_id,
      memberDepartments,
      status,
      content
    }).then(doc => {
      res.json(doc);
    }).catch(next);
  }).catch(next);
});

api.post('/report/:report_id/comment', (req, res, next) => {
  validate('info', req.params, ['report_id']);
  validate('info', req.body, ['content']);
  let { report_id } = req.params;
  let { content } = req.body;
  req._app.getStructure(req.company.structure, req.user._id).then(memberDepartments => {
    req._app.comment({
      user_id: req.user._id,
      report_id,
      memberDepartments,
      content
    }).then(doc => {
      res.json(doc);
    }).catch(next);
  }).catch(next);
});

api.delete('/report/:report_id/cancel', (req, res, next) => {
  validate('info', req.params, ['report_id']);
  req._app.reportCancel({
    user_id: req.user._id,
    report_id: req.params.report_id
  })
  .then(doc => {
    res.json(doc);
  })
  .catch(next);
});

api.delete('/report/:report_id/delete', (req, res, next) => {
  validate('info', req.params, ['report_id']);
  req._app.reportDelete({
    user_id: req.user._id,
    report_id: req.params.report_id
  })
  .then(doc => {
    res.json(doc);
  })
  .catch(next);
});
