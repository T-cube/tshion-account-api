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

  getUserWechat(user_id) {
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

  findUserByOpenid(openid) {
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

  findWechatByRandomToken(random_token) {
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

  bindWechat(user_id, wechat) {
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

  unbindWechat(user_id) {
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

  storeWechatOAuthAndGetRandomToken(wechat) {
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

  storeWechatUserinfo(wechatUser) {
    let _id = wechatUser.openid;
    delete wechatUser.openid;
    return db.wechat.user.update({_id}, {
      $set: wechatUser
    }, {
      upsert: true
    });
  }

  findWechatUserinfo(openid) {
    return db.wechat.user.findOne({
      _id: openid
    });
  }

  generateAuthCode(user_id) {
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

  getBindWechatData(wechat) {
    return _.pick(wechat, 'openid');
  }

  sendTemplateMessage(user, template, url, data) {
    let getOpenid;
    if (!ObjectId.isValid(user)) {
      getOpenid = Promise.resolve(user);
    } else {
      getOpenid = this.getUserWechat(user)
      .then(wechat => wechat && wechat.openid);
    }
    getOpenid.then(openid => {
      openid && this.getWechatApi().sendTemplate(openid, template, url, data, err => {
        if (err && err.code != 43004) {
          console.error('wechat send template error:', err);
        }
      });
    });
  }

  createMenu(menu, callback) {
    return this.getWechatApi().createMenu(menu, callback);
  }

  checkUserLocation(userId, location, maxDistance) {
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

  getUserLocations(userId) {
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

  updateUserLocation(openid, location) {
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

  getWechatApi() {
    let redis = this.model('redis');
    let wechatApi =  new WechatApi(
      config.get('wechat.appid'),
      config.get('wechat.appsecret'),
      (callback) => {
        redis.get('wechat-api-token')
        .then(token => {
          return callback(null, JSON.parse(token));
        })
        .catch(e => {
          callback(e);
          console.error(e);
        });
      },
      (token, callback) => {
        try {
          token = JSON.stringify(token);
        } catch(e) {
          return callback(e);
        }
        redis.set('wechat-api-token', token)
        .then(() => {
          callback(null);
        })
        .catch(e => {
          callback(e);
          console.error(e);
        });
      }
    );
    wechatApi.registerTicketHandle(
      (type, callback) => {
        redis.get(`wechat-ticket-token:${type}`)
        .then(token => {
          return callback(null, JSON.parse(token));
        })
        .catch(e => {
          callback(e);
          console.error(e);
        });
      },
      (type, token, callback) => {
        try {
          token = JSON.stringify(token);
        } catch(e) {
          return callback(e);
        }
        redis.set(`wechat-ticket-token:${type}`, token)
        .then(() => {
          callback(null);
        })
        .catch(e => {
          callback(e);
          console.error(e);
        });
      }
    );
    return wechatApi;
  }

}
