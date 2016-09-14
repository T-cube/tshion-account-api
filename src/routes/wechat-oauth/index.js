import express from 'express';
import oauthserver from 'oauth2-server';
import wechatOAuth from 'wechat-oauth';
import Promise from 'bluebird';
import config from 'config';
import bodyParser from 'body-parser';

import wUtil from 'lib/wechat-util.js';
import WechatOAuthModel from 'lib/wechat-oauth-model.js';
import corsHandler from 'lib/cors';
import { oauthCheck } from 'lib/middleware';

let api = express.Router();
export default api;

class Urls {
  constructor(req, res) {
    this.xhr = req.xhr;
    this.res = res;
    this.mobileUrl = config.get('mobileUrl');
  }
  sns(url) {
    if (this.xhr) {
      this.res.json({url});
    } else {
      this.res.redirect(url);
    }
  }
  user() {
    if (this.xhr) {
      this.res.json({});
    } else {
      this.res.redirect(this.mobileUrl + 'oa/company');
    }
  }
  reg(random_token) {
    if (this.xhr) {
      this.res.json({random_token});
    } else {
      this.res.redirect(this.mobileUrl + 'account/login?from_open=wechat&random_token=' + random_token);
    }
  }
  token(wechat_authcode) {
    if (this.xhr) {
      this.res.json({wechat_authcode});
    } else {
      this.res.redirect(this.mobileUrl + 'account/login?wechat_authcode=' + wechat_authcode);
    }
  }
}

const wechatOAuthClient = getOAuthClient();

const wechatOauth = oauthserver({
  model: WechatOAuthModel,
  grants: ['authorization_code'],
  debug: false,
  accessTokenLifetime: 1800,
  refreshTokenLifetime: 3600 * 24 * 15,
});

api.use(corsHandler);
api.use(bodyParser.urlencoded({ extended: true }));

api.get('/entry', (req, res) => {
  let checkCode = req.user ? req.user._id : '';
  let url = wechatOAuthClient.getAuthorizeURL(config.get('apiUrl') + 'wechat-oauth/access', checkCode, 'snsapi_userinfo');
  new Urls(req, res).sns(url);
});

api.get('/access', access);

api.post('/bind', bodyParser.json(), oauthCheck(), access);

api.get('/unbind', oauthCheck(), (req, res, next) => {
  wUtil.unbindWechat(req.user._id)
  .then(() => res.json({}))
  .catch(next);
});

api.post('/token', wechatOauth.grant());

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
  let gettingWechatOauth;
  let { code } = req.query;
  let { random_token } = req.body;
  let oauthInfoErr = new Error('can not get access_token from wechat server');
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
    let { openid } = wechat;
    let loginUser = getLoginUser(req);
    let gettingUserWechat = loginUser ? wUtil.getUserWechat(loginUser._id) : Promise.resolve(null);
    let urls = new Urls(req, res);
    return gettingUserWechat.then(loginUserWechat => {
      if (loginUserWechat) {
        return urls.user();
      }
      return wUtil.findUserByOpenid(openid)
      .then(user => {
        if (!user) {
          if (loginUser) {
            return wUtil.bindWechat(loginUser._id, wechat)
            .then(() => res.json({}));
          } else {
            return wUtil.storeWechatOAuthAndGetRandomToken(wechat)
            .then(oauthRandomToken => {
              return wUtil.findWechatUserinfo(openid)
              .then(userInfo => {
                if (userInfo) {
                  return urls.reg(oauthRandomToken);
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
                .then(() => urls.reg(oauthRandomToken));
              });
            });
          }
        } else {
          if (!loginUser) {
            return wUtil.generateAuthCode(user._id)
            .then(authCode => urls.token(authCode));
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

function getOAuthClient() {
  return new wechatOAuth(config.get('wechat.appid'), config.get('wechat.appsecret'));
}
