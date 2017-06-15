import express from 'express';
import { validate } from './schema';
import C from './constants';


let api = express.Router();
export default api;

api.get('/overview', (req, res, next) => {
  req._app.overview({
    user_id: req.user._id,
    company_id: req.company._id,
  }).then(doc => {
    return doc;
  }).catch(next);
});

api.get('/activities', (req, res, next) => {
  validate('list', req.query);
  let { range, target } = req.query;
  req._app.list({
    user_id: req.user._id,
    company_id: req.company._id,
    range,
    target,
  })
  .then(list => {
    res.json(list);
  })
  .catch(next);
});

api.get('/activities/:activity_id', (req, res, next) => {
  validate('info', req.params, ['activity_id']);
  req._app.detail({
    user_id: req.user._id,
    company_id: req.company._id,
    activity_id: req.params.activity_id
  })
  .then(doc => {
    res.json(doc);
  })
  .catch(next);
});

api.get('/activities/:activity_id/accept', (req, res, next) => {
  validate('info', req.params, ['activity_id']);
  req._app.accept({
    user_id: req.user._id,
    company_id: req.company._id,
    activity_id: req.params.activity_id
  })
  .then(doc => {
    res.json(doc);
  })
  .catch(next);
});

api.post('/activities/:activity_id/comments', (req, res, next) => {
  validate('info', req.params, ['activity_id']);
  validate('info', req.body, ['content']);
  req._app.comment({
    user_id: req.user._id,
    activity_id: req.params.activity_id,
    content: req.body.content
  })
  .then(doc => {
    res.json(doc);
  })
  .catch(next);
});

api.post('/activities', (req, res, next) => {
  validate('activity', req.body);
  req._app.createActivity(req.body).then(doc => {
    if (doc.room.status == C.APPROVAL_STATUS.PENDING) {
      // req.model('notifiction')
    }
    res.json(doc);
  }).catch(next);
});

api.post('/activities/:activity_id/approval', (req, res, next) => {
  validate('info', req.body, ['content']);
  validate('info', req.params, ['activity_id']);
  req._app.approval({
    user_id: req.user._id,
    activity_id: req.params.activity_id,
    content: req.body.content
  }).then(doc => {

  }).catch(next);
});
