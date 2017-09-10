import db from 'lib/database';
import { ObjectId } from 'mongodb';
import config from 'config';

let api = require('express').Router();
export default api;

api.get('/:hash', (req, res, next) => {
  let redis = req.model('redis');
  let hash = req.params.hash;
  redis.get(hash).then(salt => {
    if (!salt) {
      res.json({ error: 404, string: 'url no found' });
      return;
    }
    let url;
    if (/MicroMessenger|iPhone|iPad|Android|UCWEB/.test(req['headers']['user-agent'])) {
      url = config.get('mobileUrl') + 'oa/user/desktop?s=' + salt;
    } else {
      url = config.get('webUrl') + 'oa/user/desktop?s=' + salt;
    }
    res.redirect(301, url);
  });
});

// let shortURL = db.short.url;
//
// // 解析短地址进行重定向跳转
// api.get('/:hash', (req, res) => {
//   let redis = req.model('redis');
//   let hash = req.params.hash;
//
//   if (hash[0] == 'r') {
//     redis.get(hash).then(url => {
//       console.log(url);
//       if (!url) {
//         res.json({ error: 404, string: 'url no found' });
//         return;
//       }
//       res.redirect(301, url);
//     });
//   } else {
//     shortURL.findOne({ key: hash }).then(doc => {
//       console.log(doc.url);
//       if (!doc) {
//         res.json({ error: 404, string: 'url no found' });
//         return;
//       }
//       if (!doc.always) {
//         shortURL.remove({ _id: ObjectId(doc._id) }).then(() => {
//           res.redirect(301, doc.url);
//         });
//       } else {
//         res.redirect(301, doc.url);
//       }
//     });
//   }
// });
//
// // 创建短地址服务
// api.post('/', (req, res) => {
//   let redis = req.model('redis');
//   let body = req.body;
//   console.log(body);
//   let key = (Math.random() + (+new Date)).toString(36);
//   let short_host = `${req['headers']['host']}/api/s/`;
//
//   // 对url进行重新urlencode编码
//   let url = decodeURIComponent(body.url);
//   /^https?\:\/\//.test(url) || (url = 'http://' + url);
//   console.log(url);
//   let host = url.substr(0, url.indexOf('?'));
//   console.log(host);
//   let querystring = url.substr(url.indexOf('?') + 1, url.length);
//   url = [host, encodeURIComponent(querystring)].join('?');
//   if (typeof body.time == 'number') {
//     key = `r${key}`;
//     redis.set(key, url).then(status => {
//       redis.expire(key, body.time);
//       res.json({ short_url: `${short_host}${key}` });
//     });
//   } else {
//     key = `m${key}`;
//     shortURL.insert({ key: key, url: url, always: body.always && true || false }).then(doc => {
//       res.json({ short_url: `${short_host}${key}` });
//     });
//   }
//
//   // 删除短地址
//   api.delete('/:hash', (req, res, next) => {
//     let redis = req.model('redis');
//     let hash = req.params.hash;
//     if (key[0] == 'r') {
//       redis.delete(hash, (err, result) => {
//         if (err) next();
//         else res.json({ result: result });
//       });
//     } else {
//       shortURL.remove({ key: hash }).then(() => {
//         res.json({ result: 'ok' });
//       }).catch(next);
//     }
//   });
// });
