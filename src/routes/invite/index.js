import config from 'config';
import ApiError from 'lib/error';
import { ObjectId } from 'mongodb';

let api = require('express').Router();
export default api;

api.post('/', (req, res, next) => {
  let body = req.body;
  if (!body.type) {
    throw new ApiError(400, 'type_missing');
  }
  let qs = [];
  for(let key in body) {
    qs.push(`${key}=${body[key]}`);
  }
  let querystring = qs.join('&');
  let host = config.get('webUrl') + 'api/invite';
  if (body.type == 'account') {
    host += '/account';
  } else if (body.type == 'company') {
    if (!body.company_id || !ObjectId.isValid(body.company_id)) {
      throw new ApiError(400, 'invalid_company_id');
    }
    host += '/company';
  } else {
    throw new ApiError(400, 'invalid_type');
  }
  let url = [host, encodeURIComponent(querystring)].join('?');
  res.json({url});
});

api.get('/:type', (req, res, next) => {
  let url;
  let querystring = req.originalUrl.substr(req.originalUrl.indexOf('?') + 1, req.originalUrl.length);
  if (/micromessenger|ios|iphone|ipad|android|ucweb/.test(req['headers']['user-agent'].toLowerCase())) {
    url = config.get('mobile');
    if (req.params.type == 'account') {
      url += `account/register?${querystring}`;
    } else if (req.params.type == 'company') {
      url += `oa/user/mine?${querystring}`;
    } else {
      url += 'account/invalidi';
    }
  } else {
    url = config.get('webUrl');
    if (req.params.type == 'account') {
      url += `account/register?${querystring}`;
    } else if (req.params.type == 'company') {
      url += `oa/user/desktop?${querystring}`;
    } else {
      url += 'account/invalidi';
    }
  }
  res.redirect(301, url);
});
