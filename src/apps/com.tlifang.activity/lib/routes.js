import express from 'express';
import _ from 'underscore';

import { validate } from './schema';
import _C from './constants';
import { ApiError } from 'lib/error';
import C from 'lib/constants';
import { APP } from 'models/notification-setting';

let api = express.Router();
export default api;

api.get('/overview', (req, res, next) => {
  req._app.overview({
    user_id: req.user._id,
    company_id: req.company._id,
  }).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.post('/activity', (req, res, next) => {
  validate('activity', req.body);
  req._app.createActivity({
    activity: req.body,
    user_id: req.user._id,
    company_id: req.company._id
  })
  .then(activity => {
    if (activity.room.status == _C.APPROVAL_STATUS.AGREED) {
      // let from = activity.creator;
      // let to = activity.assistants.concat(activity.members, activity.followers);
      // let info = {
      //   company: req.company._id,
      //   action: C.ACTIVITY_ACTION.ADD,
      //   target_type: _C.OBJECT_TYPE.ACTIVITY,
      //   from,
      //   to
      // };
      // req.model('notification').send(info, APP);
    }
    res.json(activity);
  })
  .catch(next);
});

api.put('/activity/:activity_id', (req, res, next) => {
  validate('activityChange', req.body);
  validate('info', req.params, ['activity_id']);
  req._app.changeActivity({
    activity_id: req.params.activity_id,
    activity: req.body,
    user_id: req.user._id,
    company_id: req.company._id
  })
  .then(doc => {
    res.json(doc);
  })
  .catch(next);
});

api.get('/activity', (req, res, next) => {
  validate('list', req.query);
  let { date_start, date_end, target, last_id } = req.query;
  req._app.list({
    user_id: req.user._id,
    company_id: req.company._id,
    date_start,
    date_end,
    target,
    last_id
  })
  .then(list => {
    res.json(list);
  })
  .catch(next);
});

api.get('/activity/:activity_id', (req, res, next) => {
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

api.post('/activity/:activity_id/sign-in', (req, res, next) => {
  validate('info', req.params, ['activity_id']);
  req._app.signIn({
    user_id: req.user._id,
    activity_id: req.params.activity_id,
  })
  .then(doc => {
    res.json(doc);
  })
  .catch(next);
});

api.post('/activity/:activity_id/accept', (req, res, next) => {
  validate('info', req.params, ['activity_id']);
  req._app.accept({
    user_id: req.user._id,
    activity_id: req.params.activity_id
  })
  .then(doc => {
    res.json(doc);
  })
  .catch(next);
});

api.post('/activity/:activity_id/sign-up', (req, res, next) => {
  validate('info', req.params, ['activity_id']);
  req._app.signUp({
    user_id: req.user._id,
    company_id: req.company._id,
    activity_id: req.params.activity_id
  })
  .then(doc => {
    res.json(doc);
  })
  .catch(next);
});

api.post('/activity/:activity_id/comment', (req, res, next) => {
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

api.get('/approval', (req, res, next) => {
  validate('approvalList', req.query);
  req._app.approvalList({
    user_id: req.user._id,
    page: req.query.page,
    pagesize: req.query.pagesize,
  })
  .then(list => {
    res.json(list);
  })
  .catch(next);
});

api.get('/approval/:approval_id', (req, res, next) => {
  validate('info', req.params, ['approval_id']);
  req._app.approvalDetail({
    approval_id: req.query.approval_id,
    user_id: req.user._id
  })
  .then(doc => {
    res.json(doc);
  })
  .catch(next);
});

api.post('/approval/:approval_id/comment', (req, res, next) => {
  validate('info', req.body, ['content']);
  validate('info', req.params, ['approval_id']);
  req._app.approvalComment({
    user_id: req.user._id,
    approval_id: req.params.approval_id,
    content: req.body.content
  }).then(doc => {
    res.json(doc);
  }).catch(next);
});

api.put('/approval/:approval_id/status', (req, res, next) => {
  validate('info', req.params, ['approval_id']);
  validate('apply', req.body, ['status']);
  req._app.activityConfirm({
    user_id: req.user._id,
    approval_id: req.params.approval_id,
    status: req.body.status
  })
  .then(activity => {
    if (activity.room.status == _C.ACTIVITY_APPROVAL_STATUS.AGREED) {
      //req.model('notification')
    }
    res.json(activity);
  })
  .catch(next);
});

api.delete('/activity/:activity_id/cancel', (req, res, next) => {
  validate('info', req.params, ['activity_id']);
  req._qpp.cancel({
    user_id: req.user._id,
    activity_id: req.params.activity_id
  })
  .then(() => {
    res.json({});
  })
  .catch(next);
});

api.post('/room', (req, res, next) => {
  validate('room', req.body);
  let company_id = req.company._id;
  let user_id = req.user._id;
  if (!user_id.equals(req.company.owner)) {
    throw new ApiError(400, 'not_company_owner');
  }
  if (!_.some(req.company.members, member => member._id.equals(req.body.manager))) {
    throw new ApiError(400, 'manager_not_member');
  }
  req._app.createRoom({
    room: req.body,
    company_id,
  })
  .then(doc => {
    res.json(doc);
  })
  .catch(next);
});

api.delete('/room/:room_id', (req, res, next) => {
  validate('info', req.params, ['room_id']);
  req._app.removeRoom({
    room_id: req.params.room_id,
    user_id: req.user._id
  })
  .then(doc => {
    res.json(doc);
  })
  .catch(next);
});

api.get('/room', (req, res, next) => {
  req._app.listRoom({
    company_id: req.company._id
  })
  .then(doc => {
    res.json(doc);
  })
  .catch(next);
});

api.get('/room/:room_id', (req, res, next) => {
  validate('info', req.params, ['room_id']);
  req._app.roomDetail({
    room_id: req.params.room_id,
    company_id: req.company._id,
  })
  .then(doc => {
    res.json(doc);
  })
  .catch(next);
});

api.put('/room/:room_id', (req, res, next) => {
  validate('info', req.params, ['room_id']);
  validate('roomChange', req.body);
  req._app.changeRoom({
    room_id: req.params.room_id,
    room: req.body,
    user_id: req.user._id,
  })
  .then(doc => {
    res.json(doc);
  })
  .catch(next);
});

api.post('/room/:room_id/equipment', (req, res, next) => {
  validate('equipment', req.body);
  validate('info', req.params, ['room_id']);
  req._app.addEquipment({
    user_id: req.user._id,
    room_id: req.params.room_id,
    equipment: req.body
  })
  .then(doc => {
    res.json(doc);
  })
  .catch(next);
});

api.put('/room/:room_id/equipment/:equipment_id', (req, res, next) => {
  validate('equipment', req.body);
  validate('info', req.params, ['room_id', 'equipment_id']);
  req._app.changeRoomEquipment({
    user_id: req.user._id,
    room_id: req.params.room_id,
    equipment_id: req.params.equipment_id,
    equipment: req.body
  })
  .then(doc => {
    res.json(doc);
  })
  .catch(next);
});

api.delete('/room/:room_id/equipment/:equipment_id', (req, res, next) => {
  validate('info', req.params, ['room_id', 'equipment_id']);
  req._app.deleteEquipment({
    user_id: req.user._id,
    room_id: req.params.room_id,
    equipment_id: req.params.equipment_id,
  })
  .then(doc => {
    res.json(doc);
  })
  .catch(next);
});
