import express from 'express';
import oauthserver from 'oauth2-server';
import wechatOAuth from 'wechat-oauth';
import Promise from 'bluebird';
import config from 'config';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import wUtil from 'lib/wechat-util.js';
import WechatOAuthModel from 'lib/wechat-oauth-model.js';

let api = express.Router();
export default api;

const urls = {
  user: '/',
  reg: (id) => {
    return '/wechat-oauth/reg/' + id;
  },
  token: (authCode) => {
    return '/wechat-oauth/token2/' + authCode;
  },
};

const wechatOAuthClient = getOAuthClient();

const wechatOauth = oauthserver({
  model: WechatOAuthModel,
  grants: ['wechat'],
  debug: false,
  accessTokenLifetime: 1800,
  refreshTokenLifetime: 3600 * 24 * 15,
});

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
  wechatOAuthClient.getAccessToken(req.query.code, (err, result) => {
    console.log(result);
    if (!result || !result.data) {
      return res.json(new ApiError(403));
    }
    let wechat = result.data;
    let loginUser = getLoginUser(req);
    let gettingUserWechat = loginUser ? wUtil.getUserWechat(loginUser._id) : Promise.resolve(null);
    gettingUserWechat.then(userWechat => {
      if (userWechat) {
        return res.redirect(urls.user);
      }
      return wUtil.findUserByOpenid(wechat.openid)
      .then(user => {
        if (!user) {
          if (loginUser) {
            return wUtil.bindWechat(loginUser._id, wechat)
            .then(() => res.redirect(urls.user));
          } else {
            return wUtil.findWechatUserinfo(wechat.openid)
            .then(userInfo => {
              if (userInfo) {
                console.log('fetched db userInfo:', wechat.openid);
                return res.redirect(urls.reg(wechat.openid));
              }
              wechatOAuthClient.getUser(wechat.openid, (err, userInfo) => {
                if (err) {
                  throw new ApiError(503);
                }
                console.log('fetch wechat userinfo:', wechat.openid);
                return Promise.all([
                  wUtil.storeWechatOAuth(wechat),
                  wUtil.storeWechatUser(userInfo),
                ])
                .then(() => res.redirect(urls.reg(wechat.openid)))
                .catch(next);
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
    })
    .catch(next);
  });
});

api.get('/token', wechatOauth.grant());

// test below

api.get('/reg/:openid', (req, res, next) => {
  let openid = req.params.openid;
  if (!openid) {
    return res.json({error: 'empty openid'})
  }
  db.wechat.oauth.findOne({
    _id: openid
  })
  .then(wechat => {
    if (!wechat) {
      throw new ApiError(400, null, 'invalid openid');
    }
    let data = {
     "email": "jj@d.com",
     "email_verified": false,
     "mobile": null,
     "mobile_verified": false,
     "name": "wh-dj@hotmail.com",
     "description": "",
     "avatar": "https://tlifang.com/cdn/system/avatar/user/02.png",
     "password": "$2a$10$y4Sjlw3eCSG6UWo8P9ouJuxvoznRSMxMsKtrLGnQCxtFl1zufSB5O",
     "birthdate": ISODate("1993-01-24T01:12:44.313Z"),
     "address": {
         "country": "中国",
         "province": "福建省",
         "city": "厦门",
         "address": "观音山"
     },
     "sex": "M",
     "locale": "zh-CN",
     "timezone": "Asia/Shanghai",
     "options": {
         "notice_request": true,
         "notice_project": true
     },
     "activiated": true,
     "date_join": ISODate("2016-06-02T01:09:06.093Z"),
     "date_create": ISODate("2016-06-02T01:09:06.093Z"),
     "current_company": null,
     wechat: wechat,
    };
    return db.user.insert(data);
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.get('/token2/:authCode', (req, res, next) => {
  req.body = {
    grant_type: 'authorization_code',
    client_id: 'wechat',
    code: req.params.authCode,
  };
  wechatOauth.grant()(req, res, next);
});

function getLoginUser(req) {
  return req.user;
}

function getOAuthClient() {
  return new wechatOAuth(config.get('wechat.appid'), config.get('wechat.appsecret'));
}
