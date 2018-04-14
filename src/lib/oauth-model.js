import bcrypt from 'bcrypt';
import Promise from 'bluebird';
import ServerError from 'oauth2-server';
import Joi from 'joi';
import _ from 'underscore';
import { ObjectID } from 'lib/database';

import { ApiError } from 'lib/error';
import C from 'lib/constants';

import db from 'lib/database';
import { comparePassword, camelCaseObjectKey, isEmail, isMobile } from 'lib/utils';

import config from 'config';
const redis = require('@ym/redis').promiseRedis(config.get('vendor.redis'));

import { getUserInfoCache, getAccessTokenCache, setUserAccessTokenRelation } from './cache';


export default {
  /**
   * get access token info
   * @param {String} bearerToken
   * @param {Function} callback
   */
  getAccessToken(bearerToken, callback) {
    // console.log('# getAccessToken (bearerToken: ' + bearerToken + ')');
    getAccessTokenCache(bearerToken).then(info => {
      if (info) {
        return getUserInfoCache(info.user_id).then(user => {
          user._id = ObjectID(user._id);
          info.user = user;
          return callback(null, info);
        });
      } else {

        // find access is exists
        return db.oauth.accesstoken.findOne({ access_token: bearerToken })
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
                // 'wechat.openid': 1
              })
              .then(user => {
                token.user = user;

                return setUserAccessTokenRelation(user, token)
                  .then(() => callback(null, token));
              });
          });
      }
    }).catch(callback);
  },

  getClient(clientId, clientSecret, callback) {
    // console.log('# getClient (clientId: ' + clientId + ', clientSecret: ' + clientSecret + ')');
    if (clientSecret === null) {
      return db.oauth.clients.findOne({ client_id: clientId })
        .then(doc => {
          callback(null, camelCaseObjectKey(doc));
        }).catch(e => callback(e));
    }
    db.oauth.clients.findOne({ client_id: clientId, client_secret: clientSecret })
      .then(doc => {
        doc ?
          callback(null, camelCaseObjectKey(doc)) :
          callback(null, null);
      })
      .catch(e => callback(e));
  },

  grantTypeAllowed(clientId, grantType, callback) {
    // console.log('# grantTypeAllowed (clientId: ' + clientId + ', grantType: ' + grantType + ')');
    if (grantType === 'password') {
      const authorized_clients = [
        'com_tlifang_web',
        'com_tlifang_web_old',
        'com_tlifang_mobile',
        'com_tlifang_phone_ios',
        'com_tlifang_phone_android',
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
    if (_.isString(username)) {
      username = username.trim();
    }
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
    if (isMobile(username)) {
      query.mobile = username;
    } else if (isEmail(username)) {
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
    db.oauth.refreshtoken.findOne({ refresh_token: refreshToken })
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
            mobile: 1
          })
          .then(user => {
            token.user = user;
            callback(null, camelCaseObjectKey(token));
          });
      })
      .catch(e => callback(e));
  },

  revokeRefreshToken(refreshToken, callback) {
    db.oauth.refreshtoken.remove({ refresh_token: refreshToken })
      .then(doc => callback(null, doc))
      .catch(e => callback(e));
  },

  getAuthCode(code, callback) {
    db.oauth.code.findOne({ code: code })
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
};
