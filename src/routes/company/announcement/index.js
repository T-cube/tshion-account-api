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

/* company collection */
let api = require('express').Router();
export default api;

api.use(oauthCheck());

api.use((req, res, next) => {
  next();
});

api.get('/', (req, res, next) => {
  let type = req.query.type;
  let query = {
    is_published: true
  };
  type && (query.type = type);
  getAnnouncementList(req, res, next, query);
});

api.get('/draft', checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN), (req, res, next) => {
  getAnnouncementList(req, res, next, {
    is_published: false
  });
});

api.post('/', checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN), (req, res, next) => {
  let data = fetchAnnouncementData(req);
  data.company_id = req.company._id;
  data.date_create = new Date();
  db.announcement.insert(data)
  .then(doc => res.json(doc))
  .catch(next);
});

api.get('/:announcement_id', (req, res, next) => {
  getAnnouncement(req, res, next, true);
});

api.get('/draft/:announcement_id', checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN), (req, res, next) => {
  getAnnouncement(req, res, next, false);
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
    }, data)
    .then(doc => res.json(doc))
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

function getAnnouncementList(req, res, next, query) {
  let condition = {
    company_id: req.company._id,
  };
  _.extend(condition, query);
  db.announcement.find(condition, {
    content: 0
  })
  .then(announcements => {
    if (!announcements.length) {
      return res.json([]);
    }
    let creators = uniqObjectId(announcements.map(item => item.from.creator));
    return db.user.find({
      _id: {
        $in: creators
      }
    }, {
      name: 1,
      avavtar: 1,
    })
    .then(users => {
      announcements.forEach((announcement, k) => {
        announcements[k].from.creator = _.find(users, user => user._id.equals(announcements[k].from.creator));
      })
      res.json(announcements);
    })
  })
  .catch(next);
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
  if (!structure.findNodeById(data.from.department)) {
    throw new ApiError(400, null, 'from department is not exists');
  }
  data.to.department.forEach(i => {
    if (!structure.findNodeById(i)) {
      throw new ApiError(400, null, 'to department: ' + i  + ' is not exists');
    }
  });
  let memberIds = req.company.members.map(i => i._id);
  data.to.member.forEach(each => {
    if (-1 == indexObjectId(memberIds, each)) {
      throw new ApiError(400, null, 'to member: ' + each + ' is not exists');
    }
  });
  return data;
}

function getAnnouncement(req, res, next, is_published) {
  let announcement_id = ObjectId(req.params.announcement_id);
  db.announcement.findOne({
    company_id: req.company._id,
    _id: announcement_id,
    is_published: is_published
  })
  .then(announcement => {
    if (!announcement) {
      throw new ApiError(404);
    }
    return db.user.find({
      _id: data.from.creator
    }, {
      name: 1,
      avavtar: 1,
    })
    .then(user => {
      announcement.from.creator = user;
      res.json(announcement);
    })
  })
  .catch(next);
}
