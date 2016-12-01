import _ from 'underscore';
import express from 'express';
import config from 'config';
import db from 'lib/database';
import Promise from 'bluebird';

import { validate } from './schema.js';
import { mapObjectIdToData, getClientIp } from 'lib/utils';

let api = express.Router();
export default api;


api.get('/:qrcodeId', (req, res, next) => {
  let graceUrl = config.get('wechat.scanurl');
  let qrcodeId = parseInt(req.params.qrcodeId);
  if (!qrcodeId) {
    return res.redirect(graceUrl);
  }
  db.qrcode.findOne({
    _id: qrcodeId
  })
  .then(qrcodeInfo => {
    if (!qrcodeInfo) {
      return res.redirect(graceUrl);
    }
    return db.qrcode.scan.insert({
      qrcode_id: qrcodeId,
      ip: getClientIp(req),
      date: new Date(),
    })
    .then(() => res.redirect(qrcodeInfo.wechat_url));
  })
  .catch(next);
});


// api.delete('/:scanId', (req, res, next) => {
//   db.wechat.scan.remove({
//     _id: req.params.scanId
//   })
//   .then(() => res.json({}))
//   .catch(next);
// });
//
// api.get('/', (req, res, next) => {
//   db.wechat.scan.find({})
//   .then(scanList => {
//     return db.wechat.from.aggregate([
//       {$unwind: '$key'},
//       {'$group' : {_id: '$key', sum: {$sum: 1}}}
//     ])
//     .then(countList => {
//       scanList.forEach(scan => {
//         let item = _.find(countList, count => count._id == scan._id);
//         scan.count = item ? item.sum : 0;
//       });
//       res.json(scanList);
//     });
//   })
//   .catch(next);
// });
