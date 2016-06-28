import express from 'express';
import oauthserver from 'oauth2-server';
import wechatOAuth from 'wechat-oauth';
import Promise from 'bluebird';
import config from 'config';
// import request from 'supertest';
import bodyParser from 'body-parser';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import wUtil from 'lib/wechat-util.js';
import WechatOAuthModel from 'lib/wechat-oauth-model.js';
import corsHandler from 'lib/cors';

let api = express.Router();
export default api;

const urls = {
  user: 'http://tlf-m.findteachers.cn/',
  reg: token => {
    return 'http://tlf-m.findteachers.cn/account/login?from_open=wechat&random_token=' + token;
  },
  token: authCode => {
    return 'http://tlf-m.findteachers.cn/account/login?wechat_authcode=' + authCode;
  },
};

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
  let url = wechatOAuthClient.getAuthorizeURL(config.get('wechat.get_accesstoken_uri'), checkCode, 'snsapi_userinfo');
  res.redirect(url);
});

/**
 * if userLogin and wechat binded redirect to web app user page
 * getUserByOpenid (data.openid) -> user
 * if (!user)
 *  -> if (userLogin) bindWechat then redirect web app user page
 *  -> else get and store wechat userinfo then redirect to reg with query string: {from: 'wechat', wechat.userinfo._id}
 * else (user)
 *  -> if (!userLogin) redirect to web app get accesstoken by authCode page with query string: {authCode: authCode}
 */
api.get('/access', (req, res, next) => {
  let gettingWechatOauth;
  let { code, random_token } = req.query;
  if (random_token) {
    gettingWechatOauth = wUtil.findWechatByRandomToken(random_token);
  } else if (code) {
    gettingWechatOauth = new Promise((resolve, reject) => {
      wechatOAuthClient.getAccessToken(req.query.code, (err, result) => {
        if (!result || !result.data) {
          reject(new ApiError(403, null, 'can not get access_token from wechat server'));
        }
        resolve(result.data);
      });
    });
  } else {
    next(new ApiError(400));
  }
  gettingWechatOauth.then(wechat => {
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
          if (loginUser) {
            return wUtil.bindWechat(loginUser._id, wechat)
            .then(() => res.redirect(urls.user));
          } else {
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
            return wUtil.generateAuthCode(user._id)
            .then(authCode => res.redirect(urls.token(authCode)));
          }
        }
      });
    });
  })
  .catch(next);
});

api.post('/token', wechatOauth.grant());

function getLoginUser(req) {
  return req.user;
}

function getOAuthClient() {
  return new wechatOAuth(config.get('wechat.appid'), config.get('wechat.appsecret'));
}
