import _ from 'underscore';
import config from 'config';
import moment from 'moment';
import Promise from 'bluebird';
import WechatApi from 'wechat-api';

import db from 'lib/database';
import { generateToken } from 'lib/utils';

const wechatApi = new WechatApi(config.get('wechat.appid'), config.get('wechat.appsecret'));

export default class WechatUtil {

  static getUserWechat(user_id) {
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
  }

  static findUserByOpenid(openid) {
    if (!openid) {
      return Promise.resolve(null);
    }
    return db.user.findOne({
      'wechat.openid': openid
    }, {
      name: 1,
      avatar: 1,
      email: 1,
      mobile: 1,
      wechat: 1,
    });
  }

  static findWechatByRandomToken(random_token) {
    return db.wechat.oauth.findOne({
      random_token
    })
    .then(wechat => {
      if (!wechat) {
        return null;
      }
      let { expires_in, create_at } = wechat;
      if (new Date().getTime() > (parseInt(expires_in) * 1000 + parseInt(create_at))) {
        return null;
      }
      wechat.openid = wechat._id;
      return wechat;
    });
  }

  static bindWechat(user_id, wechat) {
    wechat = this.getBindWechatData(wechat);
    return db.user.update({
      _id: user_id
    }, {
      $set: { wechat }
    });
  }

  static storeWechatOAuthAndGetRandomToken(wechat) {
    let _id = wechat.openid;
    delete wechat.openid;
    return generateToken(20)
    .then(random_token => {
      random_token += `_${_id}`;
      wechat.random_token = random_token;
      return db.wechat.oauth.update({_id}, {
        $set: wechat
      }, {
        upsert: true
      })
      .then(() => random_token);
    });
  }

  static storeWechatUserinfo(wechatUser) {
    let _id = wechatUser.openid;
    delete wechatUser.openid;
    return db.wechat.user.update({_id}, {
      $set: wechatUser
    }, {
      upsert: true
    });
  }

  static findWechatUserinfo(openid) {
    return db.wechat.user.findOne({
      _id: openid
    });
  }

  static generateAuthCode(user_id) {
    return generateToken(20)
    .then(authCode => {
      authCode += `_${user_id}`;
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
  }

  static findUserByAuthCode(authCode) {
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
      if (user.wechat.auth.expired < new Date()) {
        return null;
      }
      return user;
    });
  }

  static getBindWechatData(wechat) {
    return _.pick(wechat, 'openid');
  }

  static sendTemplateMessage(user, template, data, url) {
    this.getUserWechat(user)
    .then(wechat => {
      if (!wechat) {
        return;
      }
      wechatApi.sendTemplate(wechat.openid, template, url, data);
    });
  }

}
