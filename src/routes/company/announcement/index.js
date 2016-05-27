import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';

import { ApiError } from 'lib/error';
import { time, indexObjectId, uniqObjectId } from 'lib/utils';
import inspector from 'lib/inspector';
import Structure from 'models/structure';
import { sanitization, validation } from './schema';
import { oauthCheck } from 'lib/middleware';
import C from 'lib/constants';
import { checkUserType } from '../utils';
import { fetchUserInfo } from 'lib/utils';

let api = require('express').Router();
export default api;

api.use(oauthCheck());

api.get('/', (req, res, next) => {
  let condition = {
    company_id: req.company._id,
    is_published: true,
  };
  let type = req.query.type;
  if (type && _.contains(['news', 'notice'], type)) {
    condition.type = type;
  }
  getAnnouncementList(condition)
  .then(doc => res.json(doc))
  .catch(next);
});

api.get('/draft', checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN), (req, res, next) => {
  getAnnouncementList({
    company_id: req.company._id,
    is_published: false,
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.post('/', checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN), (req, res, next) => {
  let data = fetchAnnouncementData(req);
  data.company_id = req.company._id;
  data.date_create = new Date();
  db.announcement.insert(data)
  .then(doc => {
    res.json(doc)
    let addingNotification = doc.is_published
      && addNotification(req, C.ACTIVITY_ACTION.RELEASE, {
      announcement: doc._id,
    })
    let addingActivity = addActivity(req, C.ACTIVITY_ACTION.CREATE, {
      announcement: doc._id
    })
    return Promise.all([addingActivity, addingNotification])
  })
  .catch(next);
});

api.get('/:announcement_id', (req, res, next) => {
  let announcement_id = ObjectId(req.params.announcement_id);
  getAnnouncement(req.company._id, announcement_id, true)
  .then(doc => res.json(doc))
  .catch(next);
});

api.get('/draft/:announcement_id',
  checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN),
  (req, res, next) => {
  let announcement_id = ObjectId(req.params.announcement_id);
  getAnnouncement(req.company._id, announcement_id, false)
  .then(doc => res.json(doc))
  .catch(next);
});

api.put('/:announcement_id', checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN), (req, res, next) => {
  let announcement_id = ObjectId(req.params.announcement_id);
  db.announcement.findOne({
    company_id: req.company._id,
    _id: announcement_id
  }, {
    is_published: 1
  })
  .then(announcement => {
    if (!announcement) {
      throw new ApiError(404);
    }
    if (announcement.is_published) {
      throw new ApiError(400, null, 'announcement can\'t be modified');
    }
    let data = fetchAnnouncementData(req);
    return db.announcement.update({
      _id: announcement_id
    }, {
      $set: data
    })
    .then(doc => {
      res.json(doc)
      let addingNotification = !announcement.is_published
        && data.is_published
        && addNotification(req, C.ACTIVITY_ACTION.RELEASE, {
        announcement: doc._id,
      })
      let addingActivity = addActivity(req, C.ACTIVITY_ACTION.UPDATE, {
        announcement: announcement_id
      })
      return Promise.all([addingActivity, addingNotification])
    })
  })
  .catch(next);
});

api.delete('/:announcement_id', checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN), (req, res, next) => {
  let announcement_id = ObjectId(req.params.announcement_id);
  db.announcement.remove({
    company_id: req.company._id,
    _id: announcement_id
  })
  .then(doc => res.json({}))
  .catch(next);
});

function getAnnouncementList(condition) {
  return db.announcement.find(condition, {
    content: 0
  })
  .then(announcements => {
    if (!announcements.length) {
      return [];
    }
    return fetchUserInfo(announcements, 'from.creator');
  })
}

function fetchAnnouncementData(req) {
  let data = req.body;
  // sanitization
  inspector.sanitize(sanitization, data);
  // validation
  let result = inspector.validate(validation, data);
  if (!result.valid) {
    throw new ApiError(400, null, result.error);
  }
  // validation of members and structure nodes
  let structure = new Structure(req.company.structure);
  data.from.creator = req.user._id;
  if (data.from.department && !structure.findNodeById(data.from.department)) {
    throw new ApiError(400, null, 'from department is not exists');
  }
  data.to && data.to.department.forEach(i => {
    if (!structure.findNodeById(i)) {
      throw new ApiError(400, null, 'to department: ' + i  + ' is not exists');
    }
  });
  let memberIds = req.company.members.map(i => i._id);
  data.to && data.to.member.forEach(each => {
    if (-1 == indexObjectId(memberIds, each)) {
      throw new ApiError(400, null, 'to member: ' + each + ' is not exists');
    }
  });
  return data;
}

function getAnnouncement(company_id, announcement_id, is_published) {
  return db.announcement.findOne({
    company_id: company_id,
    _id: announcement_id,
    is_published: is_published
  })
  .then(announcement => {
    if (!announcement) {
      throw new ApiError(404);
    }
    return fetchUserInfo(announcement, 'from.creator')
  })
}

function addActivity(req, action, data) {
  let info = {
    action: action,
    target_type: C.OBJECT_TYPE.ANNOUNCEMENT,
    company: req.company._id,
    creator: req.user._id,
  };
  _.extend(info, data);
  return req.model('activity').insert(info);
}

function addNotification(req, action, data) {
  let info = {
    action: action,
    target_type: C.OBJECT_TYPE.ANNOUNCEMENT,
    company: req.company._id,
    from: req.user._id,
    to: _.filter(req.company.members.map(member => member._id), id => id.equals(req.user._id))
  };
  _.extend(info, data);
  return req.model('notification').send(info);
}
