import _ from 'underscore';
import express from 'express';
import config from 'config';

import db from 'lib/database';
import { time, timestamp, comparePassword, hashPassword, generateToken, getEmailName } from 'lib/utils';
import { ApiError } from 'lib/error';
import C from 'lib/constants';
import { oauthCheck, fetchRegUserinfoOfOpen } from 'lib/middleware';
import { validate } from './schema';
import { randomAvatar } from 'lib/upload';
import { ValidationError } from 'lib/inspector';

let api = express.Router();
export default api;

api.post('/check', (req, res, next) => {
  let data = req.body;
  let { type } = req.body;
  validate('register', data, ['type', type]);
  db.user.find({[type]: req.body[type]}).count()
  .then(count => {
    if (count > 0) {
      throw new ValidationError({
        [type]: 'user_exists',
      });
    }
    res.json({});
  }).catch(next);
});

api.post('/register', fetchRegUserinfoOfOpen(), (req, res, next) => {
  let data = req.body;
  let type = data.type || '__invalid_type__';
  console.log(data);
  validate('register', data, ['type', type, 'code', 'password']);
  let { password, code } = data;
  let id = data[type];
  data = _.pick(data, 'type', type, 'password', 'code');
  db.user.find({[type]: id}).count()
  .then(count => {
    if (count > 0) {
      console.log(count);
      throw new ValidationError({
        [type]: 'user_exists',
      });
    }
    if (type == 'email') {
      return req.model('account').sendRegisterEmail(id);
    } else {
      return req.model('account').verifySmsCode(id, code);
    }
  })
  .then(() => {
    return hashPassword(password);
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
        district: '',
        address: '',
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
    if (req.openUserinfo) {
      _.extend(doc, req.openUserinfo);
    }
    return db.user.insert(doc);
  })
  .then(() => res.json({
    type: type,
    [type]: id,
  }))
  .catch(next);
});

api.post('/confirm', (req, res, next) => {
  const { codeLength } = config.get('userVerifyCode.email');
  const { code } = req.body;
  if (!code || !(/^[a-f0-9]+$/.test(code) && code.length == codeLength * 2 )) {
    throw new ApiError(400, 'invalid_email_code');
  }
  req.model('account').confirmRegisterEmailCode(code)
  .then(data => res.json(data))
  .catch(next);
});

api.post('/send-sms', (req, res, next) => {
  const { mobile } = req.body;
  if (!mobile || !/^1[34578]\d{9}$/.test(mobile)) {
    throw new ApiError(400, 'invalid_mobile');
  }
  db.user.find({mobile: mobile}).count()
  .then(count => {
    if (count) {
      throw new ApiError(400, 'user_exists');
    }
    req.model('account').sendSmsCode(mobile);
  })
  .then(() => res.json({}))
  .catch(next);
});

api.post('/authorise', oauthCheck(), (req, res, next) => {
  let input = req.body;
  authorise(authorise, input);
  let password = input.password;
  let _token = null;

  db.user.findOne({_id: req.user._id})
  .then(user => {
    return comparePassword(password, user.password)
    .then(result => {
      console.log(result);
      if (!result) {
        throw new ApiError('401', 'invalid_password');
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

api.post('/change-pass', oauthCheck(), (req, res, next) => {
  let data = req.body;
  console.log(data);
  let { old_password, new_password } = data;
  console.log(old_password, new_password);
  db.user.findOne({
    _id: req.user._id,
  }, {
    password: 1,
  })
  .then(user => {
    console.log(old_password, user.password);
    console.log('found user');
    return comparePassword(old_password, user.password);
  })
  .then(result => {
    console.log('compare password', result);
    if (!result) {
      throw new ApiError(401, 'bad_password', 'password is not correct');
    }
    return hashPassword(new_password);
  })
  .then(password => {
    console.log('hash password', password);
    return Promise.all([
      db.user.update({
        _id: req.user._id,
      }, {
        $set: {
          password: password,
        }
      }),
      // TODO logout current user
    ]);
  })
  .then(() => res.json({}))
  .catch(next);
});

api.post('/verify/current', oauthCheck(), (req, res, next) => {
  let data = req.body;
  let type = data.type;
  validate('register', data, ['type', type]);
  if (data[type] != req.user[type]) {
    throw new ApiError(400, 'verify_fail');
  }
  res.json({});
});

api.post('/verify/new', oauthCheck(), (req, res, next) => {
  let data = req.body;
  let type = data.type;
  let oldIdKey = 'old_' + type;
  let newIdKey = 'new_' + type;
  let schemaKeys = ['type', `${type} as ${newIdKey}`];
  let binded = req.user[type] != null;
  if (binded) {
    schemaKeys.push(`${type} as ${oldIdKey}`);
  }
  validate('register', data, schemaKeys);
  if (binded && data[oldIdKey] != req.user[type]) {
    throw new ApiError(400, 'invalid_email');
  }
  console.log(data[newIdKey]);
  req.model('account').sendCode(type, data[newIdKey])
  .then(() => res.json({}))
  .catch(next);
});

api.post('/bind', oauthCheck(), (req, res, next) => {
  console.log('/account/bind OK!!!');
  let data = req.body;
  let type = data.type;
  let oldIdKey = 'old_' + type;
  let newIdKey = 'new_' + type;
  let schemaKeys = ['type', 'code', `${type} as ${newIdKey}`];
  let binded = req.user[type] != null;
  if (binded) {
    schemaKeys.push(`${type} as ${oldIdKey}`);
  }
  validate('register', data, schemaKeys);
  if (binded && data[oldIdKey] != req.user[type]) {
    throw new ApiError(400, 'invalid_email');
  }
  req.model('account').verifyCode(type, data[newIdKey], data.code)
  .then(() => {
    console.log('verifyCode OK!!!');
    return db.user.update({
      _id: req.user._id,
    }, {
      $set: {
        [type]: data[newIdKey],
        [type + '_verified']: true,
      }
    });
  })
  .then(() => res.json({}))
  .catch(next);
});
