import express from 'express';
import oauthserver from 'oauth2-server';
import wechatOAuth from 'wechat-oauth';
import Promise from 'bluebird';
import config from 'config';
import bodyParser from 'body-parser';
import moment from 'moment';

import C from 'lib/constants';
import WechatOAuthModel from 'lib/wechat-oauth-model.js';
import { oauthCheck } from 'lib/middleware';
import { ApiError } from 'lib/error';
import db from 'lib/database';
import { generateToken, comparePassword, isMobile, isEmail, hashPassword } from 'lib/utils';
import { randomAvatar } from 'lib/upload';

const api = express.Router();
export default api;

const mobileUrl = config.get('mobileUrl');
const webUrl = config.get('webUrl');

let urls = {
  user: (whiteUrl) => {
    return `${whiteUrl ? whiteUrl : (mobileUrl + 'oa/company')}`;
  },
  reg: (token, qs, whiteUrl) => {
    return `${whiteUrl ? whiteUrl : (mobileUrl + 'account/login') }` + '?from_open=wechat&random_token=' + token + '&' + qs;
  },
  token: (authCode, qs, whiteUrl) => {
    return `${whiteUrl ? whiteUrl : (mobileUrl + 'account/login') }` + '?wechat_authcode=' + authCode + '&' + qs;
  },
};

const wechatOauth = oauthserver({
  model: WechatOAuthModel,
  grants: ['authorization_code', 'refresh_token'],
  debug: false,
  accessTokenLifetime: 1800,
  refreshTokenLifetime: 3600 * 24 * 15,
});

api.use(bodyParser.urlencoded({ extended: true }));

api.get('/entry', (req, res) => {
  let checkCode = req.user ? req.user._id : '';
  let wechatOAuthClient = getOAuthClient(req.model('redis'));
  checkCode = Object.keys(req.query).map(key => `${key}|${req.query[key]}`).join('|');
  let url = wechatOAuthClient.getAuthorizeURL(config.get('apiUrl') + 'api/wechat/oauth/access', checkCode, 'snsapi_userinfo');
  // let url = wechatOAuthClient.getAuthorizeURL(config.get('apiUrl') + 'api/wechat/oauth/access', checkCode, 'snsapi_base');
  res.redirect(url);
});

api.get('/access', access);

api.post('/bind', bodyParser.json(), oauthCheck(), access);

api.get('/unbind', oauthCheck(), (req, res, next) => {
  req.model('wechat-util').unbindWechat(req.user._id)
  .then(() => {
    res.json({});
    req.model('user-activity').createFromReq(req, C.USER_ACTIVITY.UNBIND_WECHAT);
  })
  .catch(next);
});

api.post('/token', bodyParser.json(), wechatOauth.grant(), (req, res, next) => { console.log(9999); next(); });

/**
 * if userLogin and wechat binded redirect to web app user page
 * getUserByOpenid (data.openid) -> user
 * if (!user)
 *  -> if (userLogin) bindWechat then redirect web app user page
 *  -> else get and store wechat userinfo then redirect to reg with query string: {from: 'wechat', wechat.userinfo._id}
 * else (user)
 *  -> if (!userLogin) redirect to web app get accesstoken by authCode page with query string: {authCode: authCode}
 */

api.post('/bind/account', bodyParser.json(), bind);

api.post('/create/account', bodyParser.json(), create);

api.get('/web/access', webAccess);

function webAccess(req, res, next) {
  let { code, state } = req.query;
  if (!code) {
    next(new ApiError(400, 'wechat error'));
  }
  let wechatOAuthClient = getWebOAuthClient(req.model('redis'));
  wechatOAuthClient.getAccessToken(code, (err, result) => {
    if (!result || !result.data) {
      next(new ApiError(400, 'wechat error'));
    } else {
      let wUtil = req.model('wechat-util');
      let wechat = result.data;
      let { openid, unionid } = wechat;
      wUtil.findUserByWebOpenidUnionid(openid, unionid)
      .then(user => {
        if (user) {
          return wUtil.generateAuthCode(user._id)
          .then(authCode => res.redirect(webUrl + 'account/wechat?wechat_authcode=' + authCode));
        } else {
          _storeNoaccountAuthcode(openid, unionid).then(authCode => {
            res.redirect(webUrl + 'account/entrance?wechat_authcode=' + authCode);
          });
        }
      });
    }
  });

}

function access(req, res, next) {
  console.log(11111);
  let gettingWechatOauth;
  let whiteUrl;
  let { code, state } = req.query;
  let qs = '';
  let whiteUrl_index;
  if (state) {
    qs = state.split('|').map((key, index) => {
      if (key=='whiteurl') {
        whiteUrl_index = index;
      } else if(~whiteUrl_index && (index == whiteUrl_index + 1)) {
        whiteUrl = key;
      }
      if (index % 2 == 0) return `${key}=`;
      else return `${key}&`;
    }).join('');
  }
  let { random_token } = req.body;
  let wechatOAuthClient = getOAuthClient(req.model('redis'));
  let oauthInfoErr = new Error('can not get access_token from wechat server');
  let wUtil = req.model('wechat-util');
  if (random_token) {
    gettingWechatOauth = wUtil.findWechatByRandomToken(random_token);
  } else if (code) {
    gettingWechatOauth = new Promise((resolve, reject) => {
      wechatOAuthClient.getAccessToken(code, (err, result) => {
        if (!result || !result.data) {
          return reject(oauthInfoErr);
        }
        resolve(result.data);
      });
    });
  } else {
    next(oauthInfoErr);
  }
  gettingWechatOauth.then(wechat => {
    if (!wechat) {
      throw oauthInfoErr;
    }
    console.log(2222);
    let { openid, unionid } = wechat;
    console.log(openid);
    console.log(unionid);
    let loginUser = getLoginUser(req);
    let gettingUserWechat = loginUser ? wUtil.getUserWechat(loginUser._id) : Promise.resolve(null);
    return gettingUserWechat.then(loginUserWechat => {
      if (loginUserWechat) {
        return res.redirect(urls.user(whiteUrl));
      }
      return wUtil.findUserByOpenidUnionid(openid, unionid)
      .then(user => {
        if (!user) {
          console.log(3333);
          if (loginUser) {
            console.log(4444);
            return wUtil.bindWechat(loginUser._id, wechat)
            .then(() => {
              res.json({});
              req.model('user-activity').createFromReq(req, C.USER_ACTIVITY.BIND_WECHAT);
            });
          } else {
            console.log(5555);
            return wUtil.storeWechatOAuthAndGetRandomToken(wechat)
            .then(oauthRandomToken => {
              return wUtil.findWechatUserinfo(openid)
              .then(userInfo => {
                if (userInfo) {
                  return res.redirect(urls.reg(oauthRandomToken, qs, whiteUrl));
                }
                return new Promise((resolve, reject) => {
                  wechatOAuthClient.getUser(openid, (err, userInfo) => {
                    if (err) {
                      return reject(err);
                    }
                    resolve(userInfo);
                  });
                })
                .then(userInfo => wUtil.storeWechatUserinfo(userInfo))
                .then(() => res.redirect(urls.reg(oauthRandomToken, qs, whiteUrl)));
              });
            });
          }
        } else {
          if (!loginUser) {
            console.log(6666);
            return wUtil.generateAuthCode(user._id)
            .then(authCode => res.redirect(urls.token(authCode, qs, whiteUrl)));
          }
        }
      });
    });
  })
  .catch(next);
}

function bind(req, res, next) {
  let { username, password, authCode } = req.body;
  let criteria;
  if (isMobile(username)) {
    criteria = {mobile: username};
  } else if (isEmail(username)) {
    criteria = {email: username};
  } else {
    next(new ApiError(400, 'wrong_user_name'));
  }
  _checkAuthcode(authCode)
  .then(doc => {
    return _checkAccount(criteria, password, doc);
  })
  .then(user => {
    res.json(user);
  }).catch(next);
}

function create(req, res, next) {
  let { mobile, code, password, authCode } = req.body;
  let wechat;
  if (!isMobile(mobile)) {
    next(new ApiError(400, 'wrong_mobile'));
  }
  _checkAuthcode(authCode)
  .then(doc => {
    wechat = doc;
    return req.model('account').verifySmsCode(mobile, code);
  })
  .then(() => {
    return hashPassword(password);
  })
  .then(hash => {
    return _createMobileAccount(hash, mobile, wechat);
  })
  .then(user => {
    res.json(user);
  })
  .catch(next);
}

function _checkAuthcode(auth_code) {
  return db.wechat_authcode.findOne({
    auth_code,
    used: false
  })
  .then(doc => {
    if (!doc) {
      throw new ApiError(400, 'auth_code_expire');
    }
    return doc;
  });
}

function _checkAccount(account, password, doc) {
  return db.user.findOne(
    account,
    {
      password: 1,
    }
  )
  .then(user => {
    return comparePassword(password, user.password)
    .then(result => {
      if (result) {
        return db.user.update({
          _id: user._id
        }, {
          'wechat.web_openid': doc.openid,
          'wechat.unionid': doc.unionid,
          'wechat.auth.code': doc.auth_code,
          'wechat.auth.expired': moment().add(config.get('wechat.auth_code_lifetime'), 'seconds').toDate()
        })
        .then(() => {
          return user;
        });
      } else {
        throw new ApiError(400, 'wrong_password');
      }
    });
  });
}

function _createMobileAccount(hash, mobile, wechat) {
  let doc = {
    email: '',
    email_verified: false,
    mobile: mobile,
    mobile_verified: true,
    name: mobile.slice(-4),
    description: '',
    avatar: randomAvatar('user'),
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
    activiated: true,
    date_join: new Date,
    date_create: new Date,
    current_company: null,
    wechat: {
      'wechat.openid': wechat.openid,
      'wechat.unionid': wechat.unionid,
      'wechat.auth.code': wechat.auth_code,
      'wechat.auth.expired': moment().add(config.get('wechat.auth_code_lifetime'), 'seconds').toDate()
    }
  };
  return db.user.insert(doc);
}

function getLoginUser(req) {
  return req.user;
}

function _storeNoaccountAuthcode(openid, unionid) {
  return db.wechat.authcode.findOne({
    unionid,
  })
  .then(doc => {
    if (doc) {
      return doc.auth_code;
    } else {
      return generateToken(20)
      .then(authCode => {
        return db.wechat.authcode.insert({
          openid,
          unionid,
          auth_code: authCode,
          used: false
        }).then(() => {
          return authCode;
        });
      });
    }
  });
}

function getOAuthClient(redis) {
  return new wechatOAuth(
    config.get('wechat.appid'),
    config.get('wechat.appsecret'),
    (openid, callback) => {
      redis.get(`wechat-oauth-token:${openid}`)
      .then(token => callback(null, JSON.parse(token)))
      .catch(e => {
        callback(e);
        console.error(e);
      });
    },
    (openid, token, callback) => {
      let data = null;
      try {
        data = JSON.stringify(token);
      } catch(e) {
        return callback(e);
      }
      redis.set(`wechat-oauth-token:${openid}`, data)
      .then(() => {
        redis.expire(`wechat-oauth-token:${openid}`, 60);
        callback(null);
      })
      .catch(e => {
        callback(e);
        console.error(e);
      });
    }
  );
}

function getWebOAuthClient(redis) {
  return new wechatOAuth(
    'wxcb9c819bc2095461',
    'ec3ac6091bdafc59833337c72a0dd6fa',
    (openid, callback) => {
      redis.get(`web-wechat-oauth-token:${openid}`)
      .then(token => callback(null, JSON.parse(token)))
      .catch(e => {
        callback(e);
        console.error(e);
      });
    },
    (openid, token, callback) => {
      let data = null;
      try {
        data = JSON.stringify(token);
      } catch(e) {
        return callback(e);
      }
      redis.set(`web-wechat-oauth-token:${openid}`, data)
      .then(() => {
        redis.expire(`web-wechat-oauth-token:${openid}`, 60);
        callback(null);
      })
      .catch(e => {
        callback(e);
        console.error(e);
      });
    }
  );
}
