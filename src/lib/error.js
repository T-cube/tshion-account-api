/**
 * Box RESTful API under express.js
 * Copyright(c) Qiaohui Electronic
 * Copyright(c) www.edisio.com
 *
 * API Error Handling
 * @author alvin_ma
 */

import util from 'util';
import { ValidationError } from 'express-validation';
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
    }
    this.error = known_errors[code] || 'unknown_error';
  }
  this.error_description = description || this.error;
}

util.inherits(ApiError, Error);

export function debugHttpInfo(req, res, next) {
  console.log(req.method + ' ' + req.url);
  next();
}

export function apiErrorHandler(err, req, res, next) {
  // if (err instanceof DbError) {
  //   err = ApiError(500, err.message, err.description, err);
  // }
  if (err instanceof ApiError) {
    delete err.name;
    delete err.message;
    if (err.headers) {
      res.set(err.headers);
    }
    delete err.headers;
    res.status(err.code)
    res.send(err);
    return;
  } else if (err instanceof ValidationError) {
    res.status(err.status);
    let _err = {
      code: err.status,
      error: err.message,
      error_description: err.errors
    }
    res.send(_err);
    return;
  } else {
    console.error(err);
  }
  next(err);
}
