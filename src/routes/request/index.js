import _ from 'underscore';
import express from 'express'
import { ObjectId } from 'mongodb';
import config from 'config';

import { ApiError } from 'lib/error';
import { oauthCheck } from 'lib/middleware';
import upload from 'lib/upload';
import C, { ENUMS } from 'lib/constants';
import { fetchUserInfo, mapObjectIdToData } from 'lib/utils';

// import { sanitizeValidateObject } from 'lib/inspector';
// import { infoSanitization, infoValidation, avatarSanitization, avatarValidation } from './schema';

/* users collection */
let api = express.Router();
export default api;

api.use(oauthCheck());

api.get('/', (req, res, next) => {
  // TODO only company request for now, support other type of request later.
  const limit = config.get('view.listNum');
  const { status } = req.query;
  const { before } = req.query;
  let query = {
    to: req.user._id,
    type: C.REQUEST_TYPE.COMPANY,
  };
  if (before) {
    let timeLimit = new Date(parseInt(before));
    query.date_create = {
      $lt: timeLimit,
    }
  }
  if (status) {
    if (!_.contains(ENUMS.REQUEST_STATUS, status)) {
      throw ApiError(400, null, 'invalid request status: ' + status);
    }
    query.status = status;
  }
  db.request.find(query).sort({_id: -1}).limit(limit)
  .then(list => {
    return fetchUserInfo(list, 'from');
  })
  .then(list => {
    return mapObjectIdToData(list, 'company', ['name', 'logo'], ['object']);
  })
  .then(list => {
    res.json(list);
  })
  .catch(next);
});

api.post('/:request_id/accept', (req, res, next) => {
  let requestId = ObjectId(req.params.request_id);
  db.request.findOne({
    _id: requestId,
    to: req.user._id,
  })
  .then(request => {
    if (!request) {
      throw new ApiError(404, null, 'request not found');
    }
    if (request.status != C.REQUEST_STATUS.PENDING) {
      throw new ApiError(400, null, 'request expired');
    }
    db.request.update({
      _id: requestId,
    }, {
      $set: {
        status: C.REQUEST_STATUS.ACCEPTED,
      }
    });
    if (request.type == C.REQUEST_TYPE.COMPANY) {
      let companyId = request.object;
      return Promise.all([
        db.user.update({
          _id: request.to,
        }, {
          $addToSet: {
            companies: companyId,
          }
        }),
        db.company.update({
          _id: companyId,
          'members._id': request.to,
        }, {
          $set: {
            'members.$.status': C.COMPANY_MEMBER_STATUS.NORMAL,
          }
        }),
        req.model('message').send({
          from: request.to,
          to: request.from,
          action: C.ACTION_TYPE.ACCEPT,
          object_type: C.OBJECT_TYPE.REQUEST,
          object_id: requestId,
        }),
      ]);
    }
  })
  .then(() => res.json({}))
  .catch(next);
});

api.post('/:request_id/reject', (req, res, next) => {
  let requestId = ObjectId(req.params.request_id);
  db.request.findOne({
    _id: requestId,
    to: req.user._id,
  })
  .then(request => {
    if (!request) {
      throw new ApiError(404, null, 'request not found');
    }
    if (request.status != C.REQUEST_STATUS.PENDING) {
      throw new ApiError(400, null, 'request expired');
    }
    db.request.update({
      _id: requestId,
    }, {
      $set: {
        status: C.REQUEST_STATUS.REJECTED,
      }
    });
    if (request.type == C.REQUEST_TYPE.COMPANY) {
      let companyId = request.object;
      return Promise.all([
        db.company.update({
          _id: companyId,
          'members._id': request.to,
        }, {
          $set: {
            'members.$.status': C.COMPANY_MEMBER_STATUS.REJECTED,
          }
        }),
        req.model('message').send({
          from: request.to,
          to: request.from,
          verb: C.ACTIVITY_ACTION.REJECT,
          object_type: C.OBJECT_TYPE.REQUEST,
          object_id: requestId,
        }),
      ]);
    }
  })
  .then(() => res.json({}))
  .catch(next);
});
