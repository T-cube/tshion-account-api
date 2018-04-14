import _ from 'underscore';
import { time } from 'lib/utils';
import qs from 'qs';
import { ObjectId } from 'lib/database';

import C from 'lib/constants';
import db from 'lib/database';
import { ApiError } from 'lib/error';
import oauthModel from 'lib/oauth-model';
import { camelCaseObjectKey, getClientIp, generateToken } from 'lib/utils';
import config from 'config';
import { validate } from './oauth-routes.schema';

const attemptTimes = config.get('security.attemptTimes');

const token_types = ['access_token', 'refresh_token'];

export function revokeToken(req, res, next) {
  let { token, token_type_hint } = req.body;
  if (!token_type_hint || !_.contains(token_types, token_type_hint)) {
    return next(new ApiError(400, 'invalid_request',
      'The token type provided is invalid.'));
  }
  if (!token) {
    return next(new ApiError(401, 'invalid_token',
      'The access token provided is invalid.'));
  }
  let collection = token_type_hint.replace('_','');
  return db.oauth[collection].findOne({[token_type_hint]: token})
  .then(doc => {
    if (!doc) {
      throw new ApiError(400, 'invalid token');
    } else if (time() > doc.expires) {
      throw new ApiError(400, 'token expired');
    }
    let user = doc.user_id;
    let client_id = doc.client_id;
    return db.oauth[collection].remove({[token_type_hint]: token})
    .then(() => {
      res.json({code: 200});
      // account logout log
      // if (req.body.token_type_hint == 'access_token') {
      //   req.model('user-activity').create({
      //     user,
      //     action: C.USER_ACTIVITY.LOGOUT,
      //     client_id,
      //     user_agent: req.get('user-agent'),
      //     ip: getClientIp(req),
      //     time: new Date(),
      //   });
      // }
    });
  })
  .catch(next);
}

export function login(req, res, next) {
  if (req.method == 'GET') {
    const { response_type, client_id, redirect_uri } = req.query;
    if (!response_type || !client_id || !redirect_uri) {
      throw new ApiError(400, null, 'missing oauth parameters');
    }
    res.render('oauth/login', {
      error: '',
      response_type,
      client_id,
      redirect_uri,
    });
  } else if (req.method == 'POST') {
    const { username, password, response_type, client_id, redirect_uri } = req.body;
    oauthModel.getUser(username, password, (err, user) => {
      if (err) {
        throw err;
      }
      let data = {
        error: '',
        response_type,
        client_id,
        redirect_uri,
      };
      if (!user) {
        data.error = 'login_failed';
        res.render('oauth/login', data);
      } else {
        req.session.user = user;
        let url = '/oauth/authorise?' + qs.stringify(data);
        res.redirect(302, url);
      }
    });
  } else {
    throw new ApiError(400, null, 'invalid http method');
  }
}

export function authorise(req, res, next) {
  if (req.method == 'GET') {
    res.render('oauth/authorise');
  } else if (req.method == 'POST') {
    res.send('Hello World!');
  }
}

export function authCodeCheck(req, next) {
  let userId = req.session.user && req.session.user._id || null;
  if (userId) {
    db.user.findOne({_id: ObjectId(userId), activiated: true}, {
      name: 1,
      avatar: 1,
      email: 1,
      mobile: 1,
      options: 1,
    })
    .then(user => {
      user.id = user._id;
      next(null, true, user);
    })
    .catch(e => next(e));
  } else {
    next(null, false);
  }
}

export function ipCheck() {
  return (req, res, next) => {
    if (req.body.grant_type == 'password') {
      let ip = req.ip;
      let ipKey = `attempt_times_${ip}`;
      let redis = req.model('redis');
      redis.incr(ipKey).then(ipTimes => {
        if (ipTimes == 2) {
          redis.expire(ipKey, attemptTimes.ipTTL);
        }
        if (ipTimes> attemptTimes.ipTimes) {
          throw new ApiError(429, 'too_many_requests');
        } else {
          next();
        }
      })
      .catch(next);
    } else {
      next();
    }
  };
}

export function userCheck() {
  return (req, res, next) => {
    if (req.body.grant_type !== 'password') {
      return next();
    }
    let username = req.body.username;
    let userKey = `error_times_${username}`;
    let userCaptcha = `captcha_${username}_login`;
    let redis = req.model('redis');
    try {
      validate('params', req.body);
    } catch (err) {
      redis.incr(userKey).then(times => {
        if (times == 2) {
          redis.expire(userKey, attemptTimes.userTTL);
        }
        if (times > attemptTimes.userLockTimes){
          return next(new ApiError(400, 'account_locked'));
        }
        return next(err);
      });
    }
    _checkUserActiviated(username, next);
    // redis.get(userKey).then(times => {
    //   if (times < attemptTimes.userCaptchaTimes) {
    //   } else if (times > attemptTimes.userCaptchaTimes - 1 && times < attemptTimes.userLockTimes) {
    //     if (!req.body.captcha) {
    //       redis.incr(userKey);
    //       throw new ApiError(400, 'missing_captcha');
    //     } else {
    //       redis.get(userCaptcha).then(captcha => {
    //         if (req.body.captcha.toLowerCase() == captcha.toLowerCase()) {
    //           _checkUserActiviated(username, next);
    //         } else {
    //           redis.incr(userKey);
    //           throw new ApiError(400, 'wrong_captcha');
    //         }
    //       }).catch(next);
    //     }
    //   } else {
    //     throw new ApiError(400, 'account_locked');
    //   }
    // })
    // .catch(next);
  };
}

export function captchaErrorResolve() {
  return (err, req, res, next) => {
    const redis = req.model('redis');
    const { username } = req.body;
    const userKey = `error_times_${username}`;
    if (err.error == 'invalid_grant') {
      redis.incr(userKey).then(userTimes => {
        if (userTimes > attemptTimes.userCaptchaTimes - 1) {
          throw new ApiError(400, 'login_fail_need_captcha');
        } else {
          redis.expire(userKey, attemptTimes.userTTL);
          next(err);
        }
      })
      .catch(next);
    } else {
      next(err);
    }
  };
}

export function logError() {
  return (err, req, res, next) => {
    const { grant_type } = req.body;
    if (grant_type == 'password') {
      oauthModel._getUser(req.body.username)
      .then(user => {
        req.user = user;
        // return req.model('user-activity').createFromReq(req, C.USER_ACTIVITY.LOGIN_FAIL);
      });
    }
    next(err);
  };
}

export function tokenSuccess() {
  return (req, res, next) => {
    let redis = req.model('redis');
    let userKey = `error_times_${req.body.username}`;
    let userCaptcha = `captcha_${req.body.username}_login`;
    redis.delete(userKey);
    redis.delete(userCaptcha);
    // req.model('user-activity').createFromReq(req, C.USER_ACTIVITY.LOGIN);
    db.user.update({
      _id: req.user._id
    }, {
      $set: {
        last_login: {
          type: 'PC',
          time: new Date()
        }
      }
    });
    next();
  };
}

function _checkUserActiviated(username, next) {
  db.user.findOne({
    $or: [
      { email: username },
      { mobile: username },
    ]
  }, { activiated: 1 }).then(doc => {
    if (!doc) {
      throw new ApiError(403, 'no_account');
    }
    if (!doc.activiated) {
      throw new ApiError(403, 'account_not_confirm');
    }
    next();
  }).catch(next);
}
