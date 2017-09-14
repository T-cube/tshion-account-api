import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import config from 'config';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import { oauthCheck } from 'lib/middleware';
import { upload, saveCdn } from 'lib/upload';
import C, { ENUMS } from 'lib/constants';
import { fetchUserInfo, mapObjectIdToData } from 'lib/utils';
import {
  REQUEST_REJECT,
  REQUEST_ACCEPT,
} from 'models/notification-setting';

// import { sanitizeValidateObject } from 'lib/inspector';
// import { infoSanitization, infoValidation, avatarSanitization, avatarValidation } from './schema';

/* users collection */
const api = express.Router();
export default api;

api.use(oauthCheck());

api.get('/', (req, res, next) => {
  // TODO only company request for now, support other type of request later.
  const limit = config.get('view.listNum');
  const { status } = req.query;
  const { last_id } = req.query;
  let query = {
    to: req.user._id,
    type: C.REQUEST_TYPE.COMPANY,
  };
  if (last_id) {
    let timeLimit = new Date(parseInt(last_id));
    query.date_create = {
      $lt: timeLimit,
    };
  }
  if (status) {
    if (!_.contains(ENUMS.REQUEST_STATUS, status)) {
      throw ApiError(400, 'invalid_request_status');
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
      throw new ApiError(400, 'request_expired');
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
            'members.$.joindate': new Date(),
            'members.$.status': C.COMPANY_MEMBER_STATUS.NORMAL,
          },
          $push: {
            'structure.members': {
              _id: req.user._id
            }
          }
        }),
        req.model('notification').send({
          from: request.to,
          to: request.from,
          action: C.ACTIVITY_ACTION.ACCEPT,
          target_type: C.OBJECT_TYPE.REQUEST,
          request: requestId,
        }, REQUEST_ACCEPT),
        req.model('activity').insert({
          creator: request.to,
          company: companyId,
          action: C.ACTIVITY_ACTION.JOIN,
          target_type: C.OBJECT_TYPE.COMPANY,
          request: requestId,
        }),
        disableAllRequests(request.to, companyId),
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
      throw new ApiError(400, 'request_expired');
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
        }, {
          $pull: {
            members: {
              _id: request.to,
            }
          }
        }),
        req.model('notification').send({
          from: request.to,
          to: request.from,
          action: C.ACTIVITY_ACTION.REJECT,
          target_type: C.OBJECT_TYPE.REQUEST,
          request: requestId,
        }, REQUEST_REJECT),
      ]);
    }
  })
  .then(() => res.json({}))
  .catch(next);
});

function disableAllRequests(userId, companyId) {
  return db.request.update({
    object: companyId,
    to: userId,
  }, {
    $set: {
      status: C.REQUEST_STATUS.EXPIRED,
    }
  }, {
    multi: true
  });
}
