import _ from 'underscore'
import express from 'express';
import Promise from 'bluebird';
import validator from 'express-validation';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

import validation from './validation';
import { timestamp, comparePassword, hashPassword, generateToken } from 'lib/utils';
import { ApiError } from 'lib/error';
import C from 'lib/constants';
import { oauthCheck } from 'lib/middleware';
import { sanitizeValidateObject } from 'lib/inspector';
import { authoriseSanitization, authoriseValidation } from './schema';

let api = express.Router();
export default api;


function userExistsError(type) {
  return new ApiError(400, null, [{
    field: type,
    messages: ['user account exists'],
    types: ['custom validation'],
  }]);
}

api.post('/check', validator(validation.check), (req, res, next) => {
  let { type } = req.body;
  db.user.find({[type]: req.body[type]}).count()
  .then(count => {
    if (count > 0) {
      throw userExistsError(type);
    }
    res.json({});
  }).catch(next);
});

api.post('/register', validator(validation.register), (req, res, next) => {
  let { type, password, code } = req.body;
  let id = req.body[type];
  console.log({[type]: id});
  db.user.find({[type]: id}).count()
  .then(count => {
    console.log(count);
    if (count > 0) {
      throw userExistsError(type);
    }
    return hashPassword(password, 10);
  })
  .then(hash => {
    let data = {
      email: req.body.email || null,
      email_verified: false,
      mobile: req.body.mobile || null,
      mobile_verified: type == C.USER_ID_TYPE.MOBILE,
      password: hash,
    };
    return db.user.insert(data);
  })
  .then(() => res.json({
    type: type,
    [type]: id,
  }))
  .catch(next);
});

api.post('/authorise', oauthCheck(), (req, res, next) => {
  let input = req.body;
  sanitizeValidateObject(authoriseSanitization, authoriseValidation, input);
  let password = input.password;
  let _token = null;

  db.user.findOne({_id: req.user._id})
  .then(user => {
    return comparePassword(password, user.password)
    .then(result => {
      console.log(result);
      if (!result) {
        throw new ApiError('401', 'invalid_password', 'password wrong')
      }
      return generateToken(48);
    });
  })
  .then(token => {
    _token = token;
    let data = {
      user_id: req.user._id,
      token: token,
      expires: new Date(timestamp() + 60000),
    };
    return db.auth_check_token.update({
      user_id: req.user._id,
    }, data, {
      upsert: true,
    });
  })
  .then(() => {
    res.json({
      auth_check_token: _token,
    });
  })
  .catch(next);
});
