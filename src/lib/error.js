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
    switch (code) {
      case 200:
        this.error = 'OK';
        break;
      case 400:
        this.error = 'bad_request';
        break;
      case 403:
        this.error = 'not_authorized';
        break;
      case 404:
        this.error = 'not_found';
        break;
      case 500:
        this.error = 'server_error';
        break;
      default:
        this.error = 'unknown_error';
    }
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
  }
  next(err);
}
