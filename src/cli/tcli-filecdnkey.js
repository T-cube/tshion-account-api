#!/usr/bin/env node

import '../bootstrap';
import program from 'commander';
import db from 'lib/database';

program
  .option('-o, --update', 'update document file cdn_key')
  .parse(process.argv);

console.log('document file updating');

if (!program.oauth) {
  program.outputHelp();
}

if (program.update) {

  db.document.file.find({
    relpath: {
      $exists: true
    },
    cdn_key: {
      $exists: false
    }
  }, {
    relpath: 1
  })
  .then(files => {
    return Promise.map(files, file => {
      return db.document.file.update({
        _id: file._id
      }, {
        $set: {
          cdn_key: file.relpath
        }
      });
    });
  })
  .then(() => {
    console.log('update successed!');
    process.exit();
  });

}
