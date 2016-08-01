#!/usr/bin/env node

import '../bootstrap';
import program from 'commander';
import db from 'lib/database';
import _ from 'underscore';
import moment from 'moment';

program
  .option('-o, --update', 'update user attendance sign')
  .parse(process.argv);

console.log('database updating');

if (!program.update) {
  program.outputHelp();
}

if (program.update) {

  db.attendance.sign.find({})
  .then(results => {
    return Promise.all(results.map(item => {
      let newData = [];
      let needUpdate = true;
      item.data.forEach(record => {
        let { date, sign_in, sign_out } = record;
        let newRecord = {
          date: date
        };
        if ((sign_in && sign_in.time) || (sign_out && sign_out.time)) {
          needUpdate = false;
          return null;
        }
        if (sign_in) {
          newRecord.sign_in = {
            time: sign_in,
            setting: moment(sign_in).hour(9).minute(0).toDate()
          };
        }
        if (sign_out) {
          newRecord.sign_out = {
            time: sign_out,
            setting: moment(sign_in).hour(18).minute(0).toDate()
          };
        }
        if (record.patch && record.patch.length) {
          newRecord.sign_in && _.contains(record.patch, 'sign_in') && (newRecord.sign_in.patch = true);
          newRecord.sign_out && _.contains(record.patch, 'sign_out') && (newRecord.sign_out.patch = true);
        }
        newData.push(newRecord);
      });
      if (!needUpdate) {
        return null;
      }
      return db.attendance.sign.update({
        _id: item._id
      }, {
        $set: {
          data: newData
        }
      });
    }));
  })
  .then(() => process.exit())
  .catch(e => console.error(e));
}
