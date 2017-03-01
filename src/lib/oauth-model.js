import bcrypt from 'bcrypt';
import Promise from 'bluebird';
import Joi from 'joi';
import _ from 'underscore';
import { ApiError } from 'lib/error';
import C from 'lib/constants';

import db from 'lib/database';
import { comparePassword, camelCaseObjectKey, generateToken } from 'lib/utils';

export default {
  getAccessToken(bearerToken, callback) {
    // console.log('# getAccessToken (bearerToken: ' + bearerToken + ')');
    db.oauth.accesstoken.findOne({access_token: bearerToken})
    .then(token => {
      if (!token) {
        return callback(null, null);
      }
      return db.user.findOne({
        _id: token.user_id
      }, {
        _id: 1,
        name: 1,
        email: 1,
        mobile: 1,
        avatar: 1,
      })
      .then(user => {
        token.user = user;
        callback(null, token);
      });
    })
    .catch(e => callback(e));
  },

  getClient(clientId, clientSecret, callback) {
    // console.log('# getClient (clientId: ' + clientId + ', clientSecret: ' + clientSecret + ')');
    if (clientSecret === null) {
      return db.oauth.clients.findOne({client_id: clientId})
      .then(doc => {
        callback(null, camelCaseObjectKey(doc));
      }).catch(e => callback(e));
    }
    db.oauth.clients.findOne({client_id: clientId, client_secret: clientSecret})
    .then(doc => callback(null, camelCaseObjectKey(doc)))
    .catch(e => callback(e));
  },

  grantTypeAllowed(clientId, grantType, callback) {
    // console.log('# grantTypeAllowed (clientId: ' + clientId + ', grantType: ' + grantType + ')');
    if (grantType === 'password') {
      const authorized_clients = [
        'com_tlifang_web',
        'com_tlifang_web_old',
        'com_tlifang_mobile',
        'com_tlifang_wcapp_attendance',
      ];
      let valid = _.contains(authorized_clients, clientId);
      return callback(null, valid);
    }
    callback(null, true);
  },

  saveAccessToken(token, clientId, expires, user, callback) {
    // console.log('# saveAccessToken (token: ' + token + ', clientId: ' + clientId + ', user: ' + user + ', expires: ' + expires + ')');
    let data = {
      access_token: token,
      client_id: clientId,
      user_id: user.id || user._id,
      expires: expires
    };
    db.oauth.accesstoken.insert(data).
    then(() => callback(null)).catch(e => callback(e));
  },

  getUser(username, password, callback) {
    // console.log('# getUser (username: ' + username + ', password: ' + password + ')');
    this._getUser(username)
    .then(doc => {
      if (!doc) {
        return callback(null, null);
      }
      doc.id = doc._id;
      return comparePassword(password, doc.password)
      .then(result => {
        callback(null, result ? doc : null);
      });
    })
    .catch(e => callback(e));
  },

  _getUser(username) {
    let query = {};
    if (/^1[3|4|5|7|8]\d{9}$/.test(username)) {
      query.mobile = username;
    } else if (!Joi.validate(username, Joi.string().email()).error) {
      query.email = username;
    } else {
      return Promise.resolve(null);
    }
    query.activiated = true;
    return db.user.findOne(query, {
      name: 1,
      avatar: 1,
      email: 1,
      mobile: 1,
      password: 1,
      options: 1,
    });
  },

  saveRefreshToken(token, clientId, expires, user, callback) {
    // console.log('# saveRefreshToken (token: ', token, ', clientId: ', clientId +', user: ', user, ', expires: ', expires, ')');
    let data = {
      refresh_token: token,
      client_id: clientId,
      user_id: user.id || user._id,
      expires: expires,
    };
    db.oauth.refreshtoken.insert(data).
    then(() => callback(null)).catch(e => callback(e));
  },

  getRefreshToken(refreshToken, callback) {
    // console.log('# getRefreshToken (refreshToken: ' + refreshToken + ')');
    db.oauth.refreshtoken.findOne({refresh_token: refreshToken})
    .then(token => {
      if (!token) {
        return callback(null, null);
      }
      return db.user.findOne({
        _id: token.user_id
      }, {
        _id: 1, name: 1, email: 1, mobile: 1
      })
      .then(user => {
        token.user = user;
        callback(null, camelCaseObjectKey(token));
      });
    })
    .catch(e => callback(e));
  },

  revokeRefreshToken(refreshToken, callback) {
    db.oauth.refreshtoken.remove({refresh_token: refreshToken})
    .then(doc => callback(null, doc))
    .catch(e => callback(e));
  },

  getAuthCode(code, callback) {
    db.oauth.code.findOne({code: code})
    .then(authCode => {
      if (!authCode) {
        return callback(null, null);
      }
      // console.log('# saveAuthCode: ', authCode);
      callback(null, camelCaseObjectKey(authCode));
    })
    .catch(e => callback(e));
  },

  saveAuthCode(code, clientId, expires, user, callback) {
    // console.log('# saveAuthCode: ', code, clientId, expires, user, callback);
    let data = {
      code: code,
      client_id: clientId,
      expires: expires,
      user_id: user._id,
    };
    db.oauth.code.insert(data)
    .then(() => {
      callback(null);
    })
    .catch(e => callback(e));
  },

  ipCheck() {
    return (req, res, next) => {
      let ip = req.ip;
      let ipKey = `${ip}_error_times`;
      let redis = req.model('redis');
      redis.get(ipKey).then(times => {
        if(times>99) {
          throw new ApiError(400, 'ip_invalid');
        }else {
          next();
        }
      }).catch(next);
    };
  },

  userCheck() {
    return (req, res, next) => {
      let username = req.body.username;
      let userKey = `${username}_error_times`;
      let ip = req.ip;
      let ipKey = `${ip}_error_times`;
      let userCaptcha = `${username}_login_captcha`;
      let redis = req.model('redis');
      redis.get(userKey).then(times => {
        if(times < 3){
          next();
        }else if (times > 2 && times < 11) {
          if(!req.body.captcha){
            redis.incr(userKey);
            redis.incr(ipKey);
            throw new ApiError(400, 'missing_captcha');
          }else {
            redis.get(userCaptcha).then(captcha => {
              if(req.body.captcha.toLowerCase() == captcha.toLowerCase()){
                next();
              }else {
                redis.incr(userKey);
                redis.incr(ipKey);
                throw new ApiError(400, 'wrong_captcha');
              }
            }).catch(next);
          }
        }else {
          redis.incr(ipKey);
          throw new ApiError(400, 'account_locked');
        }
      }).catch(next);
    };
  },


  wrongCheck(err, req, res, next) {
    return new Promise((resolve, reject) => {
      let redis = req.model('redis');
      let username = req.body.username;
      let userKey = `${username}_error_times`;
      let ip = req.ip;
      let ipKey = `${ip}_error_times`;
      if(err.error == 'ip_invalid' || err.error == 'missing_captcha' || err.error == 'wrong_captcha' || err.error == 'account_locked'){
        return resolve();
      }
      redis.get(ipKey).then(times => {
        if(times){
          redis.incr(ipKey);
          redis.get(userKey).then(usertimes =>{
            if(usertimes > 1) {
              redis.incr(userKey).then(() => {
                reject(new ApiError(400, 'login_fail_need_captcha'));
              });
            }else {
              redis.incr(userKey).then(() => {
                redis.expire(userKey, 60 * 60);
                resolve();
              });
            }
          });
        }else {
          redis.incr(ipKey).then(() => {
            redis.expire(ipKey, 60 * 60);
            redis.get(userKey).then(usertimes => {
              if(usertimes > 2) {
                redis.incr(userKey).then(() => {
                  reject(new ApiError(400, 'login_fail_need_captcha'));
                });
              }else {
                redis.incr(userKey).then(() => {
                  redis.expire(userKey, 60 * 60);
                  resolve();
                });
              }
            });
          });
        }
      });
    });
  },

  errorSolve(err, req, res, next) {
    return (err, req, res, next) => {
      this.wrongCheck(err, req, res, next).then(() => {
        let {body: {grant_type}} = req;
        if (grant_type == 'password') {
          this._getUser(req.body.username)
          .then(user => {
            req.user = user;
            return req.model('user-activity').createFromReq(req, C.USER_ACTIVITY.LOGIN_FAIL);
          });
        }
        next(err);
      }).catch(next);
    };
  }
};
