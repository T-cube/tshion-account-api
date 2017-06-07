import express from 'express';
import { upload, saveCdn } from 'lib/upload';
import { ApiError } from 'lib/error';
import { ObjectId } from 'mongodb';

let api = express.Router();
export default api;

api.get('/count', (req, res, next) => {
  req._app.count({company_id: req.query.company_id, user_id: req.user._id}).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.get('/report/list/:type', (req, res, next) => {
  let page = req.query.page || 0;
  let pagesize = 10;
  let type = req.params.type;
  let queryTarget = type == 'submit' ? 'user_id' : type == 'receive' ? 'report_target' :  next(new ApiError(400, 'wrong_params'));
  req._app.list({
    user_id: req.user._id,
    company_id: req.query.company_id,
    page,
    pagesize,
    queryTarget})
    .then(list => {
      res.json(list);
    }).catch(next);
});

api.get('/report/detail/:report_id', (req, res, next) => {
  let report_id = ObjectId(req.params.report_id);
  req._app.detail({user_id: req.user._id, company_id: req.query.company_id, report_id}).then(doc => {
    res.json(doc);
  });
});

api.get('/recent/:type', (req, res, next) => {
  let type = req.params.type;
  let queryTarget = type == 'submit' ? 'user_id' : type == 'receive' ? 'report_target' :  next(new ApiError(400, 'wrong_params'));
  req._app.recentReport({user_id: req.user._id, company_id: req.query.company_id, queryTarget}).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.post('/upload', upload({type: 'attachment'}).single('report_attachment'), saveCdn('cdn-private'), (req, res, next) => {
  let file = req.file;
  if (!file) {
    return res.json({});
  }
  res.json(file);
});

api.post('/report/:status', (req, res, next) => {
  let report = req.body;
  let status = req.params.status;
  status == 'applied' || status == 'draft' || next(new ApiError(400, 'invalid_report_status'));
  req._app.report({user_id: req.user._id, company_id: req.query.company_id, report, status}).then(doc => {
    res.json(doc);
  }).catch(next);
});
