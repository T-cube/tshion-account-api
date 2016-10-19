import config from 'config';
import request from 'request';
import crypto from 'crypto';

import { timestamp } from 'lib/utils';

let sha1 = crypto.createHash('sha1');
let appid = config.get('wechat.appid');
let secret = config.get('wechat.appsecret');
const wechatApiUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`;
const accessTokenKey = 'wechat-access-token';
const jsapiTicketKey = 'wechat-jsapi-ticket';
const signatureKey = 'wechat-jsapi-signature';

export default class WechatAccess {

  constructor(redis) {
    this.redis = redis;
    this.tryRefresh();
  }

  getAccessToken() {
    return this.redis.get(accessTokenKey);
  }

  getJsApiTicket() {
    return this.redis.get(jsapiTicketKey);
  }

  getJsApiSignature(url) {
    return this.redis.hmget(signatureKey, url)
    .then(signatureInfo => {
      if (signatureInfo) {
        return JSON.parse(signatureInfo);
      }
      this.getJsApiTicket()
      .then(jsapi_ticket => {
        if (!jsapi_ticket) {
          return null;
        }
        let noncestr = +new Date();
        let _timestamp = timestamp();
        let str = `jsapi_ticket=${jsapi_ticket}&noncestr=${noncestr}&timestamp=${_timestamp}&url=${url}`;
        let signature = sha1.update(str).digest('hex');
        let data = {
          noncestr,
          timestamp: _timestamp,
          url,
          signature,
          appid,
        };
        try {
          signatureInfo = JSON.stringify(data);
        } catch(e) {
          console.error(e);
          return null;
        }
        this.redis.hmset(signatureKey, [url, signatureInfo]);
        return data;
      });
    });
  }

  tryRefresh() {
    this.getAccessToken()
    .then(access_token => {
      access_token || this.refresh();
    })
    .catch(e => console.error(e));
  }

  refresh(count) {
    request(wechatApiUrl, (error, response, body) => {
      if (!error && response.statusCode == 200) {
        let data = JSON.parse(body);
        if (data.access_token) {
          this.redis.set(accessTokenKey, data.access_token);
          this.redis.expire(accessTokenKey, 3600000);
          this.doRefreshJsApiTicket(data.access_token, 0);
        }
      } else {
        console.error(error || body);
        count = count || 0;
        if (count < 10) {
          let cb = (() => this.refresh(count++)).bind(this);
          setTimeout(cb, 1000);
        }
      }
    });
  }

  doRefreshJsApiTicket(access_token, count) {
    let jsApiApi = `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${access_token}&type=jsapi`;
    request(jsApiApi, (error, response, body) => {
      if (!error && response.statusCode == 200) {
        let data = JSON.parse(body);
        if (data.ticket) {
          this.redis.set(jsapiTicketKey, data.ticket);
          this.redis.expire(jsapiTicketKey, 7200000);
          // this.redis.delete(signatureKey); // TODO ???
        }
      } else {
        console.error(error || body);
        count = count || 0;
        if (count < 10) {
          let cb = (() => this.doRefreshJsApiTicket(access_token, count++)).bind(this);
          setTimeout(cb, 1000);
        }
      }
    });
  }

}
