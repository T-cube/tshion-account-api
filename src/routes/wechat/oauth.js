import express from 'express';
import oauthserver from 'oauth2-server';
import wechatOAuth from 'wechat-oauth';
import Promise from 'bluebird';
import config from 'config';
import bodyParser from 'body-parser';

import C from 'lib/constants';
import WechatOAuthModel from 'lib/wechat-oauth-model.js';
import { oauthCheck } from 'lib/middleware';

const api = express.Router();
export default api;

const mobileUrl = config.get('mobileUrl');

const urls = {
  user: mobileUrl + 'oa/company',
  reg: token => {
    return mobileUrl + 'account/login?from_open=wechat&random_token=' + token;
  },
  token: authCode => {
    return mobileUrl + 'account/login?wechat_authcode=' + authCode;
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
function access(req, res, next) {
  console.log(11111);
  let gettingWechatOauth;
  let { code } = req.query;
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
          reject(oauthInfoErr);
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
    let { openid } = wechat;
    let loginUser = getLoginUser(req);
    let gettingUserWechat = loginUser ? wUtil.getUserWechat(loginUser._id) : Promise.resolve(null);
    return gettingUserWechat.then(loginUserWechat => {
      if (loginUserWechat) {
        return res.redirect(urls.user);
      }
      return wUtil.findUserByOpenid(openid)
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
                  return res.redirect(urls.reg(oauthRandomToken));
                }
                return new Promise((resolve, reject) => {
                  wechatOAuthClient.getUser(openid, (err, userInfo) => {
                    if (err) {
                      reject(err);
                    }
                    resolve(userInfo);
                  });
                })
                .then(userInfo => wUtil.storeWechatUserinfo(userInfo))
                .then(() => res.redirect(urls.reg(oauthRandomToken)));
              });
            });
          }
        } else {
          if (!loginUser) {
            console.log(6666);
            return wUtil.generateAuthCode(user._id)
            .then(authCode => res.redirect(urls.token(authCode)));
          }
        }
      });
    });
  })
  .catch(next);
}

function getLoginUser(req) {
  return req.user;
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
