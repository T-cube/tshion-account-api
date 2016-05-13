import express from 'express'
import { ObjectId } from 'mongodb';

import { ApiError } from 'lib/error';
import { oauthCheck } from 'lib/middleware';
import upload from 'lib/upload';
import C from 'lib/constants';

// import { sanitizeValidateObject } from 'lib/inspector';
// import { infoSanitization, infoValidation, avatarSanitization, avatarValidation } from './schema';

/* users collection */
let api = express.Router();
export default api;

api.get('/', (req, res, next) => {
  db.request.findOne({
    to: req.user._id
  })
  .then(list => {
    res.json(list);
  });
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
          verb: C.MESSAGE_VERB.ACCEPT,
          object_type: C.MESSAGE_TARGET_TYPE.REQUEST,
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
          verb: C.MESSAGE_VERB.REJECT,
          object_type: C.MESSAGE_TARGET_TYPE.REQUEST,
          object_id: requestId,
        }),
      ]);
    }
  })
  .then(() => res.json({}))
  .catch(next);
});
