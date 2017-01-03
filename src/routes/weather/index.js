import express from 'express';
import request from 'request';
import config from 'config';
import escapeRegexp from 'escape-regexp';
import crypto from 'crypto';
import querystring from 'querystring';
import { ApiError } from 'lib/error';
import db from 'lib/database';

// db.weather.area.createIndex({
//   'namecn': 1,
//   'nameen': 1,
// }).then(result => {
//   console.log(result);
// });

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
  weather.getWeatherByIp(ip, req.model('redis')).then(result => {
    res.send(result);
  }).catch(next);
});

api.get('/keyword/:keyword', (req, res, next) => {
  let keyword = req.params.keyword;
  // res.json(weather.fuzzyQuery(keyword));
  weather.fuzzyQuery(keyword).then(docs => res.json(docs)).catch(next);
});
/**
 * @author xuezi
 * @Time 2016-12-01
 */
class WEATHER {
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
    return new Promise((resolve, reject) => {
      let result = [];
      let minWeight = 0;
      db.weather.area.find({
        $or: [
          { nameen: { $regex: escapeRegexp(keyword), $options: 'i' } },
          { namecn: { $regex: escapeRegexp(keyword), $options: 'i' } },
          // { districten: { $regex: escapeRegexp(keyword), $options: 'i' } },
          // { districtcn: { $regex: escapeRegexp(keyword), $options: 'i' } },
        ],
      }, {
        fields: {
          areaid: 1,
          nameen: 1,
          namecn: 1,
          districtcn: 1,
          provcn: 1,
          nationcn: 1
        }
      }).forEach((err, doc) => {
        if (err) return reject(err);
        if (!doc) return resolve(result.sort(((a, b) => {
          return a.weight - b.weight;
        })).map(item => {
          return item.doc;
        }));
        // 权重
        let [
          weight_a,
          weight_b,
          // weight_c,
          // weight_d
        ] = [
          doc.nameen.indexOf(keyword),
          doc.namecn.indexOf(keyword),
          // doc.districten.indexOf(keyword),
          // doc.districtcn.indexOf(keyword)
        ];
        let weight = Math.min.apply(Math, [
          weight_a,
          weight_b,
          // weight_c,
          // weight_d
        ].filter(item => { return item > -1; }));
        if (result.length < 20) {
          weight > minWeight && (minWeight = weight);
          result.push({ doc: doc, weight: minWeight });
        } else {
          if (weight < minWeight) {
            result[result.findIndex(item => { return item.weight == minWeight; })] = { doc: doc, weight: weight };
            let list = result.filter(item => {
              return item.weight > weight;
            });
            if (!list.length) minWeight = weight;
          }
        }
      });
    });
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
      redis.exists(key).then(rs => {
        if (rs) {
          redis.get(key).then(cache => {
            resolve(JSON.parse(cache));
          }).catch(reject);
        } else {
          request.get(`${self.GET_WEATHER_FUTURE_URL}?${self.joinParam({areaid: areaid, needMoreDay: 1})}`, (err, response, body) => {
            if (err) return reject(err);
            body = body.replace(/http\:\/\/.+?(day|night)/g, `${config.get('apiUrl')}cdn/system/weather/icon/$1`);
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

var weather = new WEATHER(config.get('vendor.showapi.weather'));
