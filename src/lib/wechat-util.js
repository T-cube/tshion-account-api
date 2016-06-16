import config from 'config';
import moment from 'moment';
import Promise from 'bluebird';

import db from 'lib/database';
import { generateToken } from 'lib/utils';

export default {

  getUserWechat: (user_id) => {
    return db.user.findOne({
      _id: user_id
    }, {
      wechat: 1,
    })
    .then(info => {
      if (!info || !info.wechat) {
        return null;
      }
      return info.wechat;
    });
  },

  findUserByOpenid: (openid) => {
    return db.user.findOne({
      'wechat.openid': openid
    }, {
      name: 1,
      avatar: 1,
      email: 1,
      mobile: 1,
      wechat: 1,
    });
  },

  bindWechat: (user_id, wechat) => {
    return db.user.update({
      _id: user_id
    }, {
      $set: { wechat }
    });
  },

  storeWechatOAuth: (wechat) => {
    let _id = wechat.openid;
    delete wechat.openid;
    return db.wechat.oauth.update({_id}, {
      $set: wechat
    }, {
      upsert: true
    });
  },

  storeWechatUserinfo: (wechatUser) => {
    let _id = wechatUser.openid;
    delete wechatUser.openid;
    return db.wechat.user.update({_id}, {
      $set: wechatUser
    }, {
      upsert: true
    });
  },

  findWechatUserinfo: (openid) => {
    return db.wechat.user.findOne({
      _id: openid
    });
  },

  generateAuthCode: (user_id) => {
    return generateToken(48)
    .then(authCode => {
      return db.user.update({
        _id: user_id
      }, {
        $set: {
          'wechat.auth': {
            code: authCode,
            expired: moment().add(config.get('wechat.auth_code_lifetime'), 'seconds').toDate()
          }
        }
      })
      .then(() => authCode);
    });
  },

  findUserByAuthCode: (authCode) => {
    if (!authCode) {
      return Promise.resolve(null);
    }
    return db.user.findOne({
      'wechat.auth.code': authCode
    }, {
      name: 1,
      avatar: 1,
      email: 1,
      mobile: 1,
      wechat: 1,
    })
    .then(user => {
      console.log(user);
      return user;
    });
  }

};
