#!/usr/bin/env node
import { ObjectId } from 'mongodb';

import '../bootstrap';
import program from 'commander';
import db from 'lib/database';
import C from 'lib/constants';
import {cleanHtmlTags} from 'lib/utils';

program
  .option('--update', 'update announcement description')
  .parse(process.argv);

if (!program.update) {
  program.outputHelp();
}

if (program.update) {
  let promises = [];
  db.announcement.find({
    description: {$exists: false}
  })
  .forEach(announcement => {
    promises.push(db.announcement.update({
      _id: announcement._id
    }, {
      $set: {
        description: cleanHtmlTags(announcement.content)
      }
    }).then(() => {
      console.log('update', announcement._id);
    }));
  })
  .then(() => {
    return Promise.all(promises);
  })
  .then(() => {
    console.log('announcement updated');
    process.exit();
  });

}
