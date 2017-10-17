import _ from 'underscore';
import request from 'request';
import config from 'config';
import escapeRegexp from 'escape-regexp';
import crypto from 'crypto';
import querystring from 'querystring';

import db from 'lib/database';
import { ApiError } from 'lib/error';

/**
 * @author xuezi
 * @Time 2016-12-01
 */
export default class Weather {
  /**
   * constructor
   * @param {Object} options include appid, secret
   */
  constructor(options) {
    let self = this;
    self.GET_AREA_BY_IP_URL = 'http://int.dpool.sina.com.cn/iplookup/iplookup.php?';
    self.GET_WEATHER_URL = 'http://route.showapi.com/9-8';
    self.GET_WEATHER_FUTURE_URL = 'http://route.showapi.com/9-2';
    self.APPID = options.appid;
    self.SECRET = options.secret;
  }

  /**
   * 模糊查询
   * @param {String} keyword keyword
   * @return {Promise}
   */
  fuzzyQuery(keyword) {
    const keys = 'nameen,namecn,districten,districtcn,proven,provcn'.split(',');
    const kw = escapeRegexp(keyword);
    const conditions = _.map(keys, key => ({
      [key]: { $regex: kw, $options: 'i' },
    }));
    return db.weather.area.find({
      $or: conditions,
    }, {
      _id: 0,
      areaid: 1,
      namecn: 1,
      districtcn: 1,
      provcn: 1,
      nationcn: 1,
    }).sort({areaid: 1}).limit(20);
  }

  /**
   * 获取时间戳
   * @return {String}
   */
  getTimeStamp() {
    let date = new Date();
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();
    let hour = date.getHours();
    let minutes = date.getMinutes();
    let seconds = date.getSeconds();
    return `${year}${month<10?('0'+month):month}${day<10?('0'+day):day}${hour<10?('0'+hour):hour}${minutes<10?('0'+minutes):minutes}${seconds<10?('0'+seconds):seconds}`;
  }

  /**
   * 拼接参数并签名
   * @param {Object} obj
   * @return {String} qs
   */
  joinParam(obj) {
    let self = this;
    let signObject = Object.assign({
      showapi_appid: self.APPID,
      showapi_timestamp: self.getTimeStamp()
    }, obj);
    let sign = crypto.createHash('md5').update(Object.keys(signObject).sort().map(key => {
      return `${key}${signObject[key]}`;
    }).join('') + self.SECRET).digest('hex').toUpperCase();
    signObject.showapi_sign = sign;
    let qs = querystring.stringify(signObject);
    return qs;
  }

  /**
   * 由ip获取位置areaid
   * @param {String} ip
   * @return {Promise}
   */
  getIp2Area(ip) {
    let self = this;
    return new Promise((resolve, reject) => {
      request.get(`${self.GET_AREA_BY_IP_URL}ip=${ip}&format=json`, (err, response, body) => {
        if (err) return reject(err);
        let result = JSON.parse(body);
        resolve(decodeURI(result.city));
      });
    });
  }

  /**
   * 由areaid获取天气信息
   * @param {String} areaid
   * @param {Object} redis
   * @return {Promise}
   */
  getWeatherByAreaId(areaid, redis) {
    let self = this;
    return new Promise((resolve, reject) => {
      let key = `weather_${areaid}`;
      redis.exists(key).then(exists => {
        if (exists) {
          redis.get(key).then(cache => {
            resolve(JSON.parse(cache));
          }).catch(reject);
        } else {
          db.weather.area.findOne({areaid: parseInt(areaid)}, {_id: 0}).then(cityInfo => {
            const url = `${self.GET_WEATHER_FUTURE_URL}?${self.joinParam({areaid: areaid, needMoreDay: 1})}`;
            request.get(url, (err, response, body) => {
              if (err) return reject(err);
              body = body.replace(/http\:\/\/.+?(day|night)/g, `${config.get('apiUrl')}cdn/system/weather/icon/$1`);
              body = JSON.parse(body);
              if (body.showapi_res_code != 0) {
                return reject(new ApiError(400, body.showapi_res_error));
              }
              let data = body.showapi_res_body;
              data = {
                cityInfo: {
                  ...cityInfo,
                  latitude: data.cityInfo.latitude,
                  longitude: data.cityInfo.longitude,
                },
                now: data.now,
                forecast: [data.f1, data.f2, data.f3, data.f4, data.f5, data.f6, data.f7],
                time: data.time,
              };
              resolve(data);
              redis.set(key, JSON.stringify(data)).then(() => {
                redis.expire(key, 60 * 60);
              }).catch(reject);
            });
          });
        }
      }).catch(reject);
    });
  }
  /**
   * 由ip获取天气信息
   * @param {String} ip
   * @param {Object} redis
   * @return {Promise}
   */
  getWeatherByIp(ip, redis) {
    let self = this;
    return new Promise((resolve, reject) => {
      self.getIp2Area(ip).then(city => {
        db.weather.area.findOne({ namecn: city }).then(doc => {
          if (!doc) return reject(new ApiError(404, 'can not found your city in database, please retry or select city by yourself'));
          self.getWeatherByAreaId(doc.areaid, redis).then(resolve).catch(reject);
        }).catch(reject);
      }).catch(reject);
    });
  }
}
