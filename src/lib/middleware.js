import db from 'lib/database';
import { ApiError } from 'lib/error';
import { time } from 'lib/utils';
import wUtil from 'lib/wechat-util.js';

export function oauthCheck() {
  return (req, res, next) => {
    req.app.oauth.authorise()(req, res, next);
  };
}

export function authCheck() {
  return (req, res, next) => {
    let token = req.body.auth_check_token;
    if (!token || !/^\w+$/.test(token)) {
      throw new ApiError(401, 'invalid_request', 'bad or missing authorise token');
    }
    let query = {
      user_id: req.user._id,
      token: token,
    };
    db.auth_check_token.findOne(query)
    .then(doc => {
      if (!doc) {
        throw new ApiError(401, 'invalid_request', 'invalid authorise token');
      }
      db.auth_check_token.remove(query);
      if (time() > doc.expires) {
        throw new ApiError(401, 'invalid_request', 'authorise token expired');
      }
    })
    .then(() => next())
    .catch(() => next('route'));
  };
}

export function fetchRegUserinfoOfOpen(allowOpenType) {
  return (req, res, next) => {
    delete req.openUserinfo;
    let { from_open } = req.query;
    if (!from_open || (allowOpenType && -1 == allowOpenType.indexOf(from_open))) {
      next();
    }
    switch(from_open) {
    case 'wechat':
      wUtil.findWechatByRandomToken(req.query.random_token)
      .then(wechat => {
        if (!wechat) {
          next();
        }
        return wUtil.findWechatUserinfo(wechat.openid)
        .then(openUserinfo => {
          if (openUserinfo) {
            req.openUserinfo = {
              name: openUserinfo.nickname,
              sex: openUserinfo.sex,
              avatar: openUserinfo.headimgurl,
              wechat: wUtil.getBindWechatData(wechat)
            };
          }
          next();
        });
      })
      .catch(() => next('route'));
      break;
    default:
      next();
    }
  };
}
