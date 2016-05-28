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

api.get('/', (req, res, next) => {
  let companyId = req.company._id;
  let { last_id } = req.params;
  req.model('activity').fetch({
    company: companyId,
  })
  .then(list => res.json(list))
  .catch(next);
});
