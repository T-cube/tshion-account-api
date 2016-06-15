import bcrypt from 'bcrypt';
import Joi from 'joi';
import _ from 'underscore';
import { camelCase } from 'change-case';

import db from 'lib/database';
import { comparePassword } from 'lib/utils';

function camelCaseObjectKey(obj) {
  let _obj = {};
  _.each(obj, (val, key) => {
    _obj[camelCase(key)] = val;
  });
  return _obj;
}

export default {
  getAccessToken(bearerToken, callback) {
    // console.log('in getAccessToken (bearerToken: ' + bearerToken + ')');
    db.oauth.accesstoken.findOne({access_token: bearerToken})
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
        callback(null, token);
      });
    })
    .catch(e => callback(e));
  },

  getClient(clientId, clientSecret, callback) {
    // console.log('in getClient (clientId: ' + clientId + ', clientSecret: ' + clientSecret + ')');
    if (clientSecret === null) {
      return db.oauth.clients.findOne({client_id: clientId})
      .then(doc => callback(null, doc)).catch(e => callback(e));
    }
    db.oauth.clients.findOne({client_id: clientId, client_secret: clientSecret})
    .then(doc => callback(null, doc))
    .catch(e => callback(e));
  },

  grantTypeAllowed(clientId, grantType, callback) {
    // console.log('in grantTypeAllowed (clientId: ' + clientId + ', grantType: ' + grantType + ')');
    if (grantType === 'password') {
      return callback(null, true);
    }
    callback(null, true);
  },

  saveAccessToken(token, clientId, expires, user, callback) {
    // console.log('in saveAccessToken (token: ' + token + ', clientId: ' + clientId + ', userid: ' + user.id + ', expires: ' + expires + ')');
    let data = {
      access_token: token,
      client_id: clientId,
      user_id: user._id,
      expires: expires
    };
    db.oauth.accesstoken.insert(data).
    then(() => callback(null)).catch(e => callback(e));
  },

  getUser(username, password, callback) {
    // console.log('in getUser (username: ' + username + ', password: ' + password + ')');
    let query = {};
    if (/^1[3|4|5|7|8]\d{9}$/.test(username)) {
      query.mobile = username;
    } else if (!Joi.validate(username, Joi.string().email()).error) {
      query.email = username;
    } else {
      return callback(null, null);
    }
    query.activiated = true;
    db.user.findOne(query, {
      name: 1,
      avatar: 1,
      email: 1,
      mobile: 1,
      password: 1,
      options: 1,
    })
    .then(doc => {
      if (!doc) {
        return callback(null, null);
      }
      return comparePassword(password, doc.password)
      .then(result => {
        callback(null, result ? doc : null);
      });
    })
    .catch(e => callback(e));
  },

  saveRefreshToken(token, clientId, expires, user, callback) {
    // console.log('in saveRefreshToken (token: ' + token + ', clientId: ' + clientId +', userId: ' + user.id + ', expires: ' + expires + ')');
    let data = {
      refresh_token: token,
      client_id: clientId,
      user_id: user._id,
      expires: expires,
    };
    db.oauth.refreshtoken.insert(data).
    then(() => callback(null)).catch(e => callback(e));
  },

  getRefreshToken(refreshToken, callback) {
    // console.log('in getRefreshToken (refreshToken: ' + refreshToken + ')');
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
  }
};
