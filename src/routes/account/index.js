import _ from 'underscore';
import express from 'express';
import Promise from 'bluebird';
import validator from 'express-validation';
import config from 'config';

import db from 'lib/database';
import { time, timestamp, comparePassword, hashPassword, generateToken, getEmailName } from 'lib/utils';
import { ApiError } from 'lib/error';
import C from 'lib/constants';
import { oauthCheck } from 'lib/middleware';
import { sanitizeValidateObject } from 'lib/inspector';
import { authoriseSanitization, authoriseValidation, validate } from './schema';
import { randomAvatar } from 'lib/upload';
import validation from './validation';
import { ValidationError } from 'lib/inspector';

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

api.post('/register', (req, res, next) => {
  console.log(__('神马'));
  let data = req.body;
  validate('register', data);
  return res.json({});
  let { type, password, code } = data;
  let id = data[type];
  data = _.pick(data, 'type', type, 'password', 'code');
  db.user.find({[type]: id}).count()
  .then(count => {
    if (count > 0) {
      throw userExistsError(type);
    }
    if (type == 'email') {
      return req.model('account').sendConfirmEmail(id);
    } else {
      return req.model('account').confirmSmsCode(id, code);
    }
  })
  .then(() => {
    return hashPassword(password, 10);
  })
  .then(hash => {
    let doc = {
      email: data.email || null,
      email_verified: false,
      mobile: data.mobile || null,
      mobile_verified: type == C.USER_ID_TYPE.MOBILE,
      name: type == C.USER_ID_TYPE.MOBILE ? data.mobile : getEmailName(data.email),
      description: '',
      avatar: randomAvatar('user', 8),
      password: hash,
      birthdate: null,
      address: {
        country: '中国',
        province: '',
        city: '',
        address: ''
      },
      sex: null,
      locale: 'zh-CN',
      timezone: 'Asia/Shanghai',
      options: {
        notice_request: true,
        notice_project: true,
      },
      activiated: type == C.USER_ID_TYPE.MOBILE,
      date_join: time(),
      date_create: time(),
      current_company: null,
    };
    return db.user.insert(data);
  })
  .then(() => res.json({
    type: type,
    [type]: id,
  }))
  .catch(next);
});

api.post('/confirm', (req, res, next) => {
  const { codeLength } = config.get('userConfirm.email');
  const { code } = req.body;
  if (!code || !(/^[a-f0-9]+$/.test(code) && code.length == codeLength * 2 )) {
    throw new ApiError(400, null, 'invalid confirm code');
  }
  req.model('account').confirmEmailCode(code)
  .then(data => res.json(data))
  .catch(next);
});

api.post('/send-sms', (req, res, next) => {
  const { mobile } = req.body;
  if (!mobile || !/^1[34578]\d{9}$/.test(mobile)) {
    throw new ApiError(400, 'invalid_number', 'invalid mobile number');
  }
  req.model('account').sendSmsCode(mobile)
  .then(() => res.json({}))
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
        throw new ApiError('401', 'invalid_password', 'password wrong');
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
