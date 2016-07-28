import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';
import moment from 'moment';

import db from 'lib/database';

let api = express.Router();
export default api;

// update --------------------------
api.get('/attendance-sign', (req, res, next) => {
  if (req.query.code !== 'ymcococo') {
    return res.json({ok:0});
  }
  db.attendance.sign.find({})
  .then(results => {
    return Promise.all(results.map(item => {
      let newData = [];
      item.data.forEach(record => {
        let newRecord = {
          date: record.date
        };
        if (record.sign_in) {
          newRecord.sign_in = {
            time: record.sign_in,
            setting: moment(record.sign_in).hour(9).minute(0).toDate()
          };
        }
        if (record.sign_out) {
          newRecord.sign_out = {
            time: record.sign_out,
            setting: moment(record.sign_in).hour(18).minute(0).toDate()
          };
        }
        if (record.patch && record.patch.length) {
          newRecord.sign_in && _.contains(record.patch, 'sign_in') && (newRecord.sign_in.patch = true);
          newRecord.sign_out && _.contains(record.patch, 'sign_out') && (newRecord.sign_out.patch = true);
        }
        newData.push(newRecord);
      });
      return db.attendance.sign.update({
        _id: item._id
      }, {
        $set: {
          data: newData
        }
      });
    }));
  })
  .then(() => res.json({ok:1}))
  .catch(next);
});
