#!/usr/bin/env node
import { ObjectId } from 'mongodb';

import '../bootstrap';
import program from 'commander';
import db from 'lib/database';
import C from 'lib/constants';
import Preference from 'models/preference';

program
  .option('--reset', 'reset user preference')
  .parse(process.argv);

console.log('database initialization');

if (!program.reset) {
  program.outputHelp();
}

if (program.reset) {
  let preference = new Preference();
  db.user.find().forEach(user => {
    console.log('init user', user._id.toString());
    return preference.init(user._id);
  })
  .then(() => {
    console.log('preference inserted.');
  });
}
