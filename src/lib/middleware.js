import db from 'lib/database';
import { ApiError } from 'lib/error';
import { time } from 'lib/utils';

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
    let { from_open, random_token } = req.query;
    if (!from_open || (allowOpenType && -1 == allowOpenType.indexOf(from_open))) {
      return next();
    }
    switch(from_open) {
    case 'wechat':
      req.model('wechat-util').findWechatByRandomToken(random_token)
      .then(wechat => {
        if (!wechat) {
          return next();
        }
        return req.model('wechat-util').findWechatUserinfo(wechat.openid)
        .then(openUserinfo => {
          if (openUserinfo) {
            req.openUserinfo = {
              name: openUserinfo.nickname,
              sex: openUserinfo.sex,
              avatar: openUserinfo.headimgurl,
              wechat: req.model('wechat-util').getBindWechatData(wechat)
            };
          }
          next();
        });
      })
      .catch(e => {
        throw e;
      });
      break;
    default:
      next();
    }
  };
}
