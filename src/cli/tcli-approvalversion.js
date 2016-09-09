#!/usr/bin/env node

import '../bootstrap';
import program from 'commander';
import Promise from 'bluebird';
import db from 'lib/database';
import C from 'lib/constants';
import { diffObjectId } from 'lib/utils';

program
  .option('-o, --update', 'update approval template version status')
  .parse(process.argv);

console.log('database updating');

if (!program.update) {
  program.outputHelp();
}

if (program.update) {

  db.approval.template.master.find({})
  .then(list => {
    return Promise.map(list, item => {
      if (item.reversions) {
        let templateNeedUpdate = diffObjectId(item.reversions, [item.current]);
        if (!templateNeedUpdate.length) {
          return;
        }
        console.log('update templates:', templateNeedUpdate.join(','));
        db.approval.template.update({
          _id: {
            $in: templateNeedUpdate
          },
          status: C.APPROVAL_STATUS.UNUSED
        }, {
          $set: {
            status: C.APPROVAL_STATUS.OLD_VERSION
          }
        });
      }
    });
  })
  .then(() => {
    console.log('status updated');
    process.exit();
  })
  .catch(e => console.error(e));

}
