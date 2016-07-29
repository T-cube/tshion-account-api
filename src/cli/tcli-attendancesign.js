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
      item.data.forEach(record => {
        let newRecord = {
          date: record.date
        };
        if (moment(record.sign_in).isValid() || moment(record.sign_out).isValid()) {
          return null;
        }
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
  .then(() => process.exit())
  .catch(e => console.error(e));
}
