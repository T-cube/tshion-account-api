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
        return db.approval.template.find({
          _id: {
            $in: templateNeedUpdate
          },
          status: C.APPROVAL_STATUS.UNUSED
        }, {
          _id: 1
        })
        .then(tpls => {
          if (!tpls.length) {
            return null;
          }
          console.log('update templates:', tpls.map(tpl => tpl._id).join(','));
          return db.approval.template.update({
            _id: {
              $in: tpls.map(tpl => tpl._id)
            }
          }, {
            $set: {
              status: C.APPROVAL_STATUS.OLD_VERSION
            }
          }, {
            multi: true
          });
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
