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
import { ValidationError } from 'lib/inspector';
// import DbError from '../models/db-error';

//const VALIDATION_ERROR_MESSAGE = 'validation error';

export function ApiError(code, error, description, err) {
  if (this.constructor !== ApiError) {
    return new ApiError(code, error, description, err);
  }
  Error.call(this);

  this.name = this.constructor.name;
  if (err instanceof Error) {
    this.message = err.message;
    this.stack = err.stack;
  } else {
    this.message = description;
    //Error.captureStackTrace(this, this.constructor);
  }

  this.code = code;
  this.headers = {
    'Cache-Control': 'no-store',
    'Pragma': 'no-cache'
  };

  if (error) {
    this.error = error;
  } else {
    let known_errors = {
      200: 'OK',
      400: 'bad_request',
      401: 'unauthorized',
      403: 'forbidden',
      404: 'not_found',
      500: 'internel_server_error',
      503: 'service_unavailable',
    };
    this.error = known_errors[code] || 'unknown_error';
  }
  this.error_description = description || __(this.error);
}

util.inherits(ApiError, Error);

export function debugHttpInfo(req, res, next) {
  console.log(req.method + ' ' + req.url);
  next();
}

export function apiRouteError(req, res, next) {
  throw new ApiError(404, 'api_not_found');
}

export function apiErrorHandler(err, req, res, next) {
  // if (err instanceof DbError) {
  //   err = ApiError(500, err.message, err.description, err);
  // }
  if (err instanceof ValidationError) {
    res.status(400);
    let errors = _.mapObject(err.message, val => {
      if (_.isString(val)) {
        val = {
          code: val
        };
      }
      if (!_.isNull(val.code)) {
        val.message = __(val.code);
      }
      return val;
    });
    err = new ApiError(400, 'validation_error', errors);
  }
  if (!(err instanceof ApiError)) {
    console.error(err.stack);
    let error_message;
    if (process.env.NODE_ENV !== 'production') {
      error_message = err.stack.split('\n');
    }
    err = new ApiError(500, null, error_message);
  }
  delete err.name;
  delete err.message;
  if (err.headers) {
    res.set(err.headers);
  }
  delete err.headers;
  res.status(err.code);
  res.json(err);
  next();
}
