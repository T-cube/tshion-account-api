import express from 'express';
import request from 'request';
import config from 'config';

import crypto from 'crypto';
import querystring from 'querystring';

import { ApiError } from 'lib/error';
import db from 'lib/database';

let api = express.Router();

export default api;

api.get('/:areaid', (req, res, next) => {
  let areaid = req.params.areaid;

  weather.getWeatherByAreaId(areaid, req.model('redis')).then(result => {
    res.json(result);
  }).catch(next);
});

api.get('/', (req, res, next) => {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  ip = ip.replace(/\:\:f+\:/, '');

  // testip
  ip = '120.36.191.13';

  weather.getWeatherByIp(ip, req.model('redis')).then(result => {
    res.send(result);
  }).catch(next);
});



class WEATHER {
  constructor(options) {
    let self = this;

    self.GET_AREA_BY_IP_URL = 'http://int.dpool.sina.com.cn/iplookup/iplookup.php?';
    self.GET_WEATHER_URL = 'http://route.showapi.com/9-8';
    self.GET_WEATHER_FUTURE_URL = 'http://route.showapi.com/9-2';


    self.APPID = options.appid;
    self.SECRET = options.secret;
  }

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

  getWeatherByAreaId(areaid, redis) {
    let self = this;
    return new Promise((resolve, reject) => {
      let key = `weather_${areaid}`;

      redis.exists(key).then(rs => {
        if (rs) {
          redis.get(key).then(cache => {
            resolve(JSON.parse(cache));
          }).catch(reject);
        } else {

          request.get(`${self.GET_WEATHER_FUTURE_URL}?${self.joinParam({areaid: areaid, needMoreDay: 1})}`, (err, response, body) => {
            if (err) return reject(err);

            let data = JSON.parse(body);

            if (data.showapi_res_code != 0) return reject(new ApiError(400, data.showapi_res_error));

            resolve(data.showapi_res_body);

            redis.set(key, JSON.stringify(data.showapi_res_body)).then(() => {
              redis.expire(key, 60 * 60);
            }).catch(reject);
          });
        }
      }).catch(reject);
    });
  }

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

var weather = new WEATHER(config.get('showapi.weather'));
