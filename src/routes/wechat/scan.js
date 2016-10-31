import _ from 'underscore';
import express from 'express';
import config from 'config';
import db from 'lib/database';
import WechatApi from 'wechat-api';
import Promise from 'bluebird';

import { validate } from './schema.js';
import { mapObjectIdToData } from 'lib/utils';

const wechatApi = new WechatApi(config.get('wechat.appid'), config.get('wechat.appsecret'));

let api = express.Router();
export default api;

api.use(express.query());

api.post('/', (req, res, next) => {
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

api.delete('/:scanId', (req, res, next) => {
  db.wechat.scan.remove({
    _id: req.params.scanId
  })
  .then(() => res.json({}))
  .catch(next);
});

api.get('/', (req, res, next) => {
  db.wechat.scan.find({})
  .then(scanList => {
    return db.wechat.from.aggregate([
      {$unwind: '$key'},
      {'$group' : {_id: '$key', sum: {$sum: 1}}}
    ])
    .then(countList => {
      scanList.forEach(scan => {
        let item = _.find(countList, count => count._id == scan._id);
        scan.count = item ? item.sum : 0;
      });
      res.json(scanList);
    });
  })
  .catch(next);
});

api.get('/:scanId', (req, res, next) => {
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
