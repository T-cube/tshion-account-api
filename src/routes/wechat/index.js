import express from 'express';
import config from 'config';
import db from 'lib/database';
import { ObjectId } from 'mongodb';
import WechatApi from 'wechat-api';

import { validate } from './schema.js';

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
  wechatApi.createLimitQRCode(data.key, (e, result) => {
    if (e) {
      throw e;
    }
    let ticket = result.ticket;
    let url = wechatApi.showQRCodeURL(ticket);
    data.ticket = ticket;
    data.url = url;
    db.wechat.scan.insert(data)
    .then(doc => res.json(doc))
    .catch(next);
  });
});

api.delete('/scan/:scanId', (req, res, next) => {
  db.wechat.scan.remove({
    _id: ObjectId(req.params.scanId)
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
    console.log('scan summary', doc);
    res.json(doc);
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
    key: ObjectId(req.params.scanId)
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
    .sort('-_id')
    .skip((page - 1) * pagesize)
    .limit(pagesize)
    .then(list => data.list = list)
  ])
  .then(() => res.json(data))
  .catch(next);
});

api.get('/scan/origin/token', (req, res, next) => {

});
