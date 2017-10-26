import db from 'lib/database';
import { ObjectId } from 'mongodb';
import config from 'config';
import { oauthCheck } from 'lib/middleware';

let api = require('express').Router();
export default api;


let shortURL = db.short.url;

// api.get('/:hash', (req, res, next) => {
//   let redis = req.model('redis');
//   let hash = req.params.hash;
//   redis.get(hash).then(salt => {
//     let url;
//     if (/micromessenger|ios|iphone|ipad|android|ucweb/.test(req['headers']['user-agent'].toLowerCase())) {
//       if (!salt) {
//         url = config.get('mobileUrl') + 'account/invalidi';
//       } else if (salt[0] == 'c') {
//         url = config.get('mobileUrl') + 'oa/user/mine?s=' + salt;
//       } else if (salt[0] == 'a') {
//         url = config.get('mobileUrl') + 'account/register?u=' + salt;
//       } else if (hash[0] == 'e') {
//         url = salt;
//       }
//     } else {
//       if (!salt) {
//         url = config.get('webUrl') + 'account/invalidi';
//       } else if (salt[0] == 'c') {
//         url = config.get('webUrl') + 'oa/user/desktop?s=' + salt;
//       } else if (salt[0] == 'a') {
//         url = config.get('webUrl') + 'account/register?u=' + salt;
//       } else if (hash[0] == 'e') {
//         url = salt;
//       }
//     }
//     res.redirect(301, url);
//   });
// });

api.get('/:hash', (req, res, next) => {
  let redis = req.model('redis');
  let hash = req.params.hash;

  let promise;
  if(/^m\_/.test(hash)) {
    promise = shortURL.findOne({key: hash}).then(doc=>{
      if(doc && (new Date < doc.expire)) return doc.url;
      return null;
    });
  } else {
    promise = redis.get(hash);
  }


  promise.then(url => {
    if (url) {
      res.redirect(301, url);
    } else {
      if (/micromessenger|ios|iphone|ipad|android|ucweb/.test(req['headers']['user-agent'].toLowerCase())) {
        url = config.get('mobileUrl') + '404.html';
        res.redirect(301, url);
      } else {
        url = config.get('webUrl') + '404.html';
        res.redirect(301, url);
      }
    }
  });
});

api.post('/', (req, res) => {
  let redis = req.model('redis');
  let timestamp = new Date().getTime();
  let body = req.body;
  let key = (Math.random() + timestamp).toString(36);
  let time = 3600, always = false;
  if (body.time && typeof body.time == 'number') {
    time = body.time;
  }
  if(body.always) always = true;
  let short_host = config.get('webUrl') + 's/';
  // 对url进行重新urlencode编码
  let url = decodeURIComponent(body.url);
  let protocol = /^http[s]?\:\/\//.test(url) ? '' : 'http://';
  let host = protocol + url.substr(0, url.indexOf('?'));
  let querystring = url.substr(url.indexOf('?') + 1, url.length);
  url = [host, encodeURIComponent(querystring)].join('?');

  let promise;
  if(always){
    key = 'm_'+key;
    promise = shortURL.findOne({url}).then(doc=>{
      let expire = new Date(+new Date + time * 1000);
      if(doc) {
        key = doc.key;
        return shortURL.update({_id: doc._id}, {$set: {expire}});
      } else {
        return shortURL.insert({key, time, url, expire});
      }
    });
  } else {
    promise = redis.setex(key, time, url);
  }
  promise.then(() => {
    res.json({ short_url: `${short_host}${key}` });
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
