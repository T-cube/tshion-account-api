import express from 'express';
import oauthserver from 'oauth2-server';
import wechatOAuth from 'wechat-oauth';
import Promise from 'bluebird';
import config from 'config';

import { ApiError } from 'lib/error';
import wUtil from 'lib/wechat-util.js';
import WechatOAuthModel from 'lib/wechat-oauth-model.js';

let api = express.Router();
export default api;

const urls = {
  user: '/',
  reg: (id) => {
    return `/${id}`;
  },
  token: (authCode) => {
    return `/${authCode}`;
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
                return res.redirect(urls.reg(wechat.openid));
              }
              wechatOAuthClient.getUser(wechat.openid, (err, userInfo) => {
                if (err) {
                  throw new ApiError(503);
                }
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

function getLoginUser(req) {
  return req.user;
}

function getOAuthClient() {
  return new wechatOAuth(config.get('wechat.appid'), config.get('wechat.appsecret'));
}
