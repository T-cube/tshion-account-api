import _ from 'underscore';
import config from 'config';
import moment from 'moment';
import Promise from 'bluebird';
import WechatApi from 'wechat-api';
import { ObjectId } from 'mongodb';

import db from 'lib/database';
import { generateToken, timestamp, getGpsDistance } from 'lib/utils';
import MarsGPS from 'lib/mars-gps.js';

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
    return Promise.all([
      db.user.update({
        _id: user_id
      }, {
        $set: { wechat }
      }),
      db.wechat.user.update({
        _id: wechat.openid
      }, {
        $set: { user_id }
      })
    ]);
  }

  static unbindWechat(user_id) {
    return Promise.all([
      db.user.update({
        _id: user_id
      }, {
        $unset: {
          wechat: 1
        }
      }),
      db.wechat.user.update({
        user_id
      }, {
        $unset: {
          user_id: 1
        }
      })
    ]);
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

  static sendTemplateMessage(user, template, url, data) {
    let getOpenid;
    if (!ObjectId.isValid(user)) {
      getOpenid = Promise.resolve(user);
    } else {
      getOpenid = this.getUserWechat(user)
      .then(wechat => wechat && wechat.openid);
    }
    getOpenid.then(openid => {
      openid && this.getWechatApi().sendTemplate(openid, template, url, data);
    });
  }

  static createMenu(menu, callback) {
    return this.getWechatApi().createMenu(menu, callback);
  }

  static checkUserLocation(userId, location, maxDistance) {
    return this.getUserLocations(userId).then(locations => {
      if (!locations || !locations.length) {
        return false;
      }
      let marsGPS = new MarsGPS();
      let distanceOk = false;
      locations.forEach(item => {
        let { pos } = item;
        pos =  marsGPS.transform(pos);
        let distance = getGpsDistance(pos, location);
        if (distance <= maxDistance) {
          distanceOk = true;
        }
      });
      return distanceOk;
    });
  }

  static getUserLocations(userId) {
    return db.user.findOne({
      _id: userId
    }, {
      wechat: 1
    })
    .then(user => {
      if (!user || !user.wechat || !user.wechat.openid) {
        return null;
      }
      return db.wechat.location.findOne({
        _id: user.wechat.openid
      });
    })
    .then(doc => {
      if (!doc) {
        return [];
      }
      let locations = doc.locations;
      return locations.filter(location => {
        return ((timestamp() - timestamp(location.time)) < 1000 * 60)
          && location.pos.precision < 100; // 30s
      });
    });
  }

  static updateUserLocation(openid, location) {
    return db.wechat.location.findOne({
      _id: openid
    })
    .then(doc => {
      let locations = (doc && doc.locations || []).slice(-12);
      locations.push({
        time: new Date(),
        pos: location
      });
      return db.wechat.location.update({
        _id: openid
      }, {
        $set: {
          locations: locations
        }
      }, {
        upsert: true
      });
    });
  }

  static getWechatApi() {
    return new WechatApi(
      config.get('wechat.appid'),
      config.get('wechat.appsecret'),
      (openid, callback) => {
        this.redis.get(`wechat-api-token:${openid}`)
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
        this.redis.set(`wechat-api-token:${openid}`, data)
        .then(() => {
          this.redis.expire(`wechat-api-token:${openid}`, 2 * 60 * 60);
          callback(null);
        })
        .catch(e => {
          callback(e);
          console.error(e);
        });
      }
    );
  }

}
