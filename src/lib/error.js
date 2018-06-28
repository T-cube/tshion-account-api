/**
 * Box RESTful API under express.js
 * Copyright(c) Qiaohui Electronic
 * Copyright(c) www.edisio.com
 *
 * API Error Handling
 * @author alvin_ma
 */

import _ from 'underscore';
import util from 'util';
import {ValidationError} from 'lib/inspector';
import config from 'config';

const debugApiErrorEnabled = config.get('debug.apiError');

//const VALIDATION_ERROR_MESSAGE = 'validation error';
let known_errors = {
  200: 'OK',
  400: 'bad_request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  500: 'internel_server_error',
  503: 'service_unavailable'
};

export function ApiError(code, error, description, err) {
  if (this.constructor !== ApiError) {
    return new ApiError(code, error, description, err);
  }

  if (!description)
    description = error;
  Object.assign(this, {code, message: description});
}

util.inherits(ApiError, Error);

export function apiRouteError(req, res, next) {
  if (!res.headersSent) {
    throw new ApiError(404, 'api_not_found');
  }
}

export function apiErrorHandler(err, req, res, next) {
  // if (err instanceof DbError) {   err = ApiError(500, err.message,
  // err.description, err); }
  if (err instanceof ValidationError) {
    res.status(400);
    let errors = _.mapObject(err.message, val => {
      if (_.isString(val)) {
        val = {
          code: val
        };
      }
      if (!_.isNull(val.code)) {
        // console.log(val)
        val.message = _(val.code);
      }
      return val;
    });
    err = new ApiError(400, 'validation_error', errors);
    console.log('', err.stack);
  }
  if (!(err instanceof ApiError)) {
    console.error(err.stack);
    let error_message;
    if (process.env.NODE_ENV !== 'production') {
      error_message = err
        .stack
        .split('\n');
    }
    err = new ApiError(500, null, error_message);
  }
  console.log('handle error:', err);
  delete err.name;
  // delete err.message;
  try {
    res.set(err.headers);
    delete err.headers;
    res.status(err.code);
    res.json(err);
  } catch (e) {
    console.error('headers already sent');
  }
  if (debugApiErrorEnabled) {
    console.error(`${req.method} ${req.url} ${err.code}`, _.pick(err, 'error', 'error_description'));
  }
}
