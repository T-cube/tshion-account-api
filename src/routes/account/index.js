import _ from 'underscore';
import express from 'express';
import config from 'config';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';
import moment from 'moment';

import db from 'lib/database';
import {
  time,
  timestamp,
  isMobile,
  comparePassword,
  hashPassword,
  generateToken,
  getEmailName,
  downloadFile,
  saveCdnInBucket,
} from 'lib/utils';
import { ApiError } from 'lib/error';
import C from 'lib/constants';
import { oauthCheck, fetchRegUserinfoOfOpen } from 'lib/middleware';
import { validate } from './schema';
import { randomAvatar, cropAvatar } from 'lib/upload';
import { ValidationError } from 'lib/inspector';
import { decryptFromHex } from 'lib/rsa';

const api = express.Router();
export default api;


api.post('/check', (req, res, next) => {
  let data = req.body;
  let { type } = req.body;
  validate('register', data, ['type', type]);
  db.user.findOne({
      [type]: req.body[type]
    }, { activiated: 1 })
    .then(user => {
      if (!user) {
        return res.sendJson(200);
      }
      if (type == 'email' && !user.activiated) {
        throw new ValidationError({
          [type]: 'user_not_confirmed'
        });
      } else {
        throw new ValidationError({
          [type]: 'user_exists'
        });
      }
    }).catch(next);
});

api.post('/register', fetchRegUserinfoOfOpen(), (req, res, next) => {
  let data = req.body;
  let invite_data = _.clone(req.body);
  console.log(data);
  let type = data.type || '__invalid_type__';
  validate('register', data, ['type', type, 'code', 'password']);
  let { password, code } = data;
  console.log(1,data);
  let id = data[type];
  data = _.pick(data, 'type', type, 'password', 'code');
  console.log(2,data);
  db.user.findOne({
      [type]: id
    }, { activiated: 1 })
    .then(user => {
      console.log('user:',user);
      if (user) {
        if (type == 'email' && !user.activiated) {
          return req.model('account').sendRegisterEmail(id)
            .then(() => {
              throw new Error('resend_code');
            });
        } else {
          throw new ValidationError({
            [type]: 'user_exists'
          });
        }
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
        email: data.email || '',
        email_verified: false,
        mobile: data.mobile || '',
        mobile_verified: type == C.USER_ID_TYPE.MOBILE,
        name: type == C.USER_ID_TYPE.MOBILE ? data.mobile : getEmailName(data.email),
        description: '',
        avatar: '',
        // avatar: randomAvatar('user'),
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
        activiated: type == C.USER_ID_TYPE.MOBILE,
        date_join: time(),
        date_create: time(),
        current_company: null,
      };
      return db.user.insert(doc);
    })
    .then(user => {
      res.sendJson({
        type: type,
        [type]: id,
      });
      if (invite_data.user_id && ObjectId.isValid(invite_data.user_id)) {
        db.user.findOne({
            _id: ObjectId(invite_data.user_id)
          })
          .then(inviter => {
            if (inviter) {
              db.user.findOneAndUpdate({
                  _id: user._id
                }, {
                  $set: {
                    recommend: inviter._id
                  }
                }, {
                  returnOriginal: false,
                  returnNewDocument: true
                })
                .then(invitee => {
                  if (invitee.value) {
                    let { a } = invite_data;
                    if (a) {
                      var rpc = req.model('clientRpc');
                      var user = invitee.value;
                      rpc.route('/activity/handler/recommend', {
                        recommender: user.recommend,
                        user_id: user._id,
                        activity_id: a,
                        email: user.email,
                        mobile: user.mobile
                      }, function(data) {
                        console.log(data);
                      });
                    }
                  }
                });
            }
          });
      }
      // init notification setting when user activiated
      // if (type == C.USER_ID_TYPE.MOBILE) {
      //   req.model('notification-setting').initUserDefaultSetting(user._id);
      //   req.model('preference').init(user._id);
      // }
      // 保存第三方账户的图片
      if (req.openUserinfo && req.openUserinfo.avatar) {
        return downloadFile(req.openUserinfo.avatar, 'avatar').then(downloadFile => {
            return saveCdnInBucket(req.model('qiniu').bucket('cdn-public'), downloadFile);
          })
          .then(cdnFile => {
            req.file = cdnFile;
            let avatar = cropAvatar(req);
            return db.user.update({
              _id: user._id
            }, {
              $set: { avatar }
            });
          })
          .catch(e => {
            console.error(e);
          });
      }
    })
    .catch(err => {
      console.log(err);
      if (err.message == 'resend_code') {
        res.sendJson({ resend: true });
      } else {
        next(err);
      }
    });
});

api.post('/confirm', (req, res, next) => {
  const { codeLength } = config.get('userVerifyCode.email');
  const { code } = req.body;
  if (!code || !(/^[a-f0-9]+$/.test(code) && code.length == codeLength * 2)) {
    throw new ApiError(400, 'invalid_email_code');
  }
  req.model('account').confirmRegisterEmailCode(code)
    .then(data => {
      res.sendJson(data);
      // init notification setting when user activiated
      // req.model('notification-setting').initUserDefaultSetting(data.user_id);
      // req.model('preference').init(data.user_id);
    })
    .catch(next);
});

api.post('/send-sms', (req, res, next) => {
  const { mobile, nation_code, captcha, hex } = req.body;
  console.log(req.body, req.query);
  if (!mobile || !/^\d+$/g.test(mobile)) {
    // if (!mobile || !isMobile(mobile)) {
    throw new ApiError(400, 'invalid_mobile');
  }

  const frequency = config.get('security.frequency.userVerifyCode');
  req.model('security').limitRequestFrequency('verifycode', mobile, frequency)
    .then(() => {
      return db.user.find({ mobile: mobile }).count();
    })
    .then(count => {
      if (count) {
        throw new ApiError(400, 'user_exists');
      }
      let promise = Promise.resolve();
      // if (!/micromessenger|ios|iphone|ipad|android|ucweb|tlfapp|okhttp/.test(req['headers']['user-agent'].toLowerCase())) {
      //   promise = req
      //     .model('redis')
      //     .get(`captcha_${mobile}_${C.CAPTCHA_TYPE.SMS}`)
      //     .then(result => {
      //       if (!result) {
      //         throw new ApiError(400, 'wrong_mobile');
      //       }
      //       if (result.toLowerCase() != captcha.toLowerCase()) {
      //         throw new ApiError(400, 'wrong_captcha');
      //       }
      //       return;
      //     });
      // } else {
      if (hex) {
        // 如果是app注册，需要提交加密过后的手机号进行校验获取验证码
        let hex_decrypt = decryptFromHex(hex);
        if (mobile != hex_decrypt) {
          throw new ApiError(400, 'wrong_hex');
        }
      } else {
        throw new ApiError(400, 'need_hex_param');
      }
      // }

      let redis = req.model('redis');
      let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      let sms_config = config.get('sms');
      console.log('request sms code:', ip, mobile);
      console.log('request sms limit:', sms_config.limit.ip, sms_config.limit.mobile);
      return promise.then(() => {

        return redis.mget(`tlf_sms_cache_${mobile}`, `tlf_sms_cache_ip_${ip}`)
          .then(([mobile_request_times, ip_request_times]) => {
            // ip 注册请求数一天最多50个
            if (ip_request_times >= sms_config.limit.ip) {
              throw new ApiError('400', 'sms_ip_outof_day_limit');
            } else {
              if (mobile_request_times < sms_config.limit.mobile) {

                let tomorrow = +moment(moment().add(1, 'd').format('YYYY-MM-DD'));

                let mobile_key = `sms_cache_${mobile}`;
                let ip_key = `sms_cache_${ip}`;
                return Promise.all(([
                  redis.incr(mobile_key),
                  redis.incr(ip_key),
                  redis.pexpireat(mobile_key, tomorrow),
                  redis.pexpireat(ip_key, tomorrow)
                ])).then(() => {
                  return req.model('account').sendSmsCode(mobile, nation_code);
                });
              } else {
                throw new ApiError('400', 'sms_outof_day_limit');
              }
            }
          });
      });
    })
    .then(() => res.sendJson(200))
    .catch(next);
});

api.post('/authorise', oauthCheck(), (req, res, next) => {
  let input = req.body;
  validate('authorise', input);
  let password = input.password;
  let _token = null;

  db.user.findOne({ _id: req.user._id })
    .then(user => {
      return comparePassword(password, user.password);
    })
    .then(result => {
      if (!result) {
        throw new ApiError('401', 'invalid_password');
      }
      return generateToken(48);
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
      res.sendJson({
        auth_check_token: _token,
      });
    })
    .catch(next);
});

api.post('/change-pass', oauthCheck(), (req, res, next) => {
  let data = req.body;
  validate('register', data, ['password as old_password', 'password as new_password']);
  let { old_password, new_password } = data;
  db.user.findOne({
      _id: req.user._id,
    }, {
      password: 1,
    })
    .then(user => {
      return comparePassword(old_password, user.password);
    })
    .then(result => {
      if (!result) {
        throw new ApiError(401, 'bad_password', 'password is not correct');
      }
      return hashPassword(new_password);
    })
    .then(password => {
      return Promise.all([
        db.user.update({
          _id: req.user._id,
        }, {
          $set: {
            password: password,
          }
        }),
        req.model('user-activity').createFromReq(req, C.USER_ACTIVITY.CHANGE_PASSWORD)
        // TODO logout current user
      ]);
    })
    .then(() => res.sendJson(200))
    .catch(next);
});

api.post('/recover/send-code', (req, res, next) => {
  let data = req.body;
  let type = data.type || '__invalid_type__';
  validate('register', data, ['type', type]);
  let account = req.body[type];
  const frequency = config.get('security.frequency.userVerifyCode');
  req.model('security').limitRequestFrequency('send-code', account, frequency)
    .then(() => {
      return req.model('account').checkExistance(type, account, true);
    })
    .then(() => {
      return req.model('account').sendCode(type, account, 'reset_pass');
    })
    .then(() => res.sendJson(200))
    .catch(next);
});

api.post('/recover/verify', (req, res, next) => {
  let data = req.body;
  let type = data.type || '__invalid_type__';
  validate('register', data, ['type', type, 'code']);
  let account = data[type];
  req.model('security').limitRequestFrequency('verify-code', account, 1000)
    .then((status) => {
      req.model('account').checkExistance(type, account, true);
    })
    .then(() => {
      return req.model('account').verifyCode(type, account, data.code);
    })
    .then(() => {
      return req.model('account').getToken(type, account);
    })
    .then(token => res.sendJson({ token }))
    .catch(next);
});

api.post('/recover/change-pass', (req, res, next) => {
  const data = req.body;
  const { token } = data;
  let type = data.type || '__invalid_type__';
  validate('register', data, ['type', type, 'code', 'password']);
  let account = data[type];
  req.model('account').verifyToken(type, account, token)
    .then(userId => {
      return hashPassword(data.password)
        .then(hash => {
          return db.user.update({ _id: userId }, {
            $set: {
              password: hash,
            }
          });
        });
    })
    .then(() => res.sendJson(200))
    .catch(next);
});

api.post('/verify/current', oauthCheck(), (req, res, next) => {
  let data = req.body;
  let type = data.type;
  validate('register', data, ['type', type]);
  if (data[type] != req.user[type]) {
    throw new ApiError(400, 'verify_fail');
  }
  res.sendJson(200);
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
  if (binded) {
    if (data[oldIdKey] != req.user[type]) {
      throw new ApiError(400, 'invalid_email');
    } else if (data[oldIdKey] == data[newIdKey]) {
      throw new ApiError(400, 'account_not_changed');
    }
  }
  let newAccount = data[newIdKey];
  req.model('account').checkExistance(type, newAccount, false)
    .then(() => {
      return req.model('account').sendCode(type, newAccount);
    })
    .then(() => res.sendJson(200))
    .catch(next);
});

api.post('/bind', oauthCheck(), (req, res, next) => {
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
  if (binded) {
    if (data[oldIdKey] != req.user[type]) {
      throw new ApiError(400, 'invalid_email');
    } else if (data[oldIdKey] == data[newIdKey]) {
      throw new ApiError(400, 'account_not_changed');
    }
  }
  let newAccount = data[newIdKey];
  req.model('account').checkExistance(type, newAccount, false)
    .then(() => {
      return req.model('account').verifyCode(type, newAccount, data.code);
    })
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
    .then(() => res.sendJson(200))
    .catch(next);
});

api.get('/activity', oauthCheck(), (req, res, next) => {
  req.model('user-activity').getLatestLoginInfo(req.user._id)
    .then(doc => res.sendJson(doc))
    .catch(next);
});
