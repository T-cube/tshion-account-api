import express from 'express';
import config from 'config';
import db from 'lib/database';
import WechatApi from 'wechat-api';
import Promise from 'bluebird';

import { validate } from './schema.js';
import { generateToken, mapObjectIdToData } from 'lib/utils';

const wechatApi = new WechatApi(config.get('wechat.appid'), config.get('wechat.appsecret'));

let api = express.Router();
export default api;

api.use(express.query());

api.get('/scan', (req, res, next) => {
  db.wechat.scan.find({})
  .then(data => res.json(data))
  .catch(next);
});

api.post('/scan', (req, res, next) => {
  let data = req.body;
  validate('scan', data);
  db.wechat.scan.find({}, {
    _id: 1
  })
  .sort({
    _id: -1
  })
  .limit(1)
  .then(scanList => {
    let last = scanList[0];
    let last_id;
    if (!last) {
      last_id = 0;
    } else {
      last_id = last._id + 1;
    }
    data._id = last_id;
    return db.wechat.scan.insert(data)
    .then(doc => {
      let scanId = last_id;
      wechatApi.createLimitQRCode(scanId, (e, result) => {
        if (e) {
          throw e;
        }
        let ticket = result.ticket;
        let url = wechatApi.showQRCodeURL(ticket);
        doc.ticket = ticket;
        doc.url = url;
        db.wechat.scan.update({
          _id: scanId
        }, {
          $set: {ticket, url}
        })
        .then(() => res.json(doc))
        .catch(next);
      });
    });
  })
  .catch(next);
});

api.delete('/scan/:scanId', (req, res, next) => {
  db.wechat.scan.remove({
    _id: req.params.scanId
  })
  .then(() => res.json({}))
  .catch(next);
});

api.get('/scan/from', (req, res, next) => {
  db.wechat.from.aggregate([
    {$unwind: '$key'},
    {'$group' : {_id: '$key', sum: {$sum: 1}}}
  ])
  .then(doc => {
    return Promise.map(doc, item => {
      db.wechat.scan.find({
        _id: item._id
      })
      .then(scan => item.scan = scan);
    })
    .then(() => res.json(doc));
  })
  .catch(next);
});

api.get('/scan/from/:scanId', (req, res, next) => {
  let { page, pagesize} = req.query;
  page = parseInt(page) || 1;
  pagesize = parseInt(pagesize);
  pagesize = (pagesize <= config.get('view.maxListNum') && pagesize > 0)
    ? pagesize
    : config.get('view.listNum');
  let condition = {
    key: req.params.scanId
  };
  let data = {};
  Promise.all([
    db.wechat.from.count(condition)
    .then(sum => {
      data.totalrows = sum;
      data.page = page;
      data.pagesize = pagesize;
    }),
    db.wechat.from.find(condition)
    .sort({
      _id: -1
    })
    .skip((page - 1) * pagesize)
    .limit(pagesize)
    .then(list => data.list = list)
  ])
  .then(() => {
    return Promise.all(data.list.map(i => {
      return db.wechat.user.findOne({
        _id: i.openid
      })
      .then(wechatInfo => {
        i.wechat_info = wechatInfo;
        i.user_info = wechatInfo && wechatInfo.user_id;
      });
    }));
  })
  .then(() => mapObjectIdToData(data.list, 'user', 'name,avatar,email,mobile,birthdate,address', 'user_info'))
  .then(() => res.json(data))
  .catch(next);
});

api.get('/scan/origin/token', (req, res, next) => {
  return generateToken(48).then(token => {
    db.wechat_from.export.insert({
      token: token,
    });
    res.json({ token });
  })
  .catch(next);
});
