import express from 'express';
import { upload, saveCdn } from 'lib/upload';
import { ApiError } from 'lib/error';
import { ObjectId } from 'mongodb';
import { validate } from './schema';

let api = express.Router();
export default api;

api.get('/overview', (req, res, next) => {
  req._app.overview({
    company_id: req.company._id,
    user_id: req.user._id
  }).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.get('/review', (req, res, next) => {
  req._app.review({user_id: req.user._id, company_id: req.company._id}).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.get('/report', (req, res, next) => {
  validate('list', req.query);
  let { page, type, pagesize, status } = req.query;
  req._app.list({
    user_id: req.user._id,
    company_id: req.company._id,
    page,
    pagesize,
    type,
    status
  })
  .then(list => {
    res.json(list);
  }).catch(next);
});

api.get('/report/:report_id', (req, res, next) => {
  validate('info', req.params);
  let { report_id } = req.params;
  req._app.detail(report_id).then(doc => {
    res.json(doc);
  });
});


api.post('/upload', upload({type: 'attachment'}).single('report_attachment'), saveCdn('cdn-private'), (req, res, next) => {
  let file = req.file;
  if (!file) {
    return res.json({});
  }
  res.json(file);
});

api.post('/report', (req, res, next) => {
  validate('report', req.body);
  let report = req.body;
  req._app.report({user_id: req.user._id, company_id: req.company._id, report}).then(doc => {
    res.json(doc);
  }).catch(next);
});
