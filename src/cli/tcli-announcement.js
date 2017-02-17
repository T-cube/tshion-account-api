#!/usr/bin/env node
import { ObjectId } from 'mongodb';

import '../bootstrap';
import program from 'commander';
import db from 'lib/database';
import C from 'lib/constants';
import {cleanHtmlTags, textEllipsis} from 'lib/utils';

program
  .option('--update', 'update announcement description')
  .parse(process.argv);

if (!program.update) {
  program.outputHelp();
}

if (program.update) {
  db.announcement.find({
    // description: {$exists: false}
  })
  .forEach(announcement => {
    let description = textEllipsis(cleanHtmlTags(announcement.content), 50);
    db.announcement.update({
      _id: announcement._id
    }, {
      $set: {description}
    });
  })
  .then(() => {
    console.log('announcement updated');
    // process.exit();
  });

}
