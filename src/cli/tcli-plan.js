#!/usr/bin/env node
import { ObjectId } from 'mongodb';

import '../bootstrap';
import program from 'commander';
import db from 'lib/database';
import C from 'lib/constants';

program
  .option('--init', 'insert plan')
  .parse(process.argv);

console.log('database initialization');

if (!program.init) {
  program.outputHelp();
}

if (program.init) {

  db.plan.remove({})
  .then(() => {
    return db.plan.insert([
      {
        name: '免费版',
        type: C.TEAMPLAN.FREE,
        description: '免费团队，可使用T立方的基本功能',
        default_member: 10,
        project_actived: 5,
        project_all: 10,
        store: 10000000000, // 10G
        project_store: 100000000, // 100M
        inc_member_store: 0,
        max_file_size: 5000000, // 5M
        max_member: 10,
      },
      {
        name: '专业版',
        type: C.TEAMPLAN.PRO,
        description: '专业版团队',
        default_member: 10,
        project_actived: 50,
        project_all: 50,
        store: 20000000000, // 20G
        project_store: 500000000, // 500M
        inc_member_store: 0,
        max_file_size: 10000000, // 10M
        max_member: 50,
        ext_info: '专业版',
      },
      {
        name: '企业版',
        type: C.TEAMPLAN.ENT,
        description: '企业版团队',
        default_member: 10,
        project_actived: 100,
        project_all: 100,
        store: 10000000000, // 100G
        project_store: 1000000000, // 1G
        inc_member_store: 10000000000, // 1G
        max_file_size: 20000000, // 20M
        max_member: 100,
        ext_info: '企业版',
      },
    ]);
  })
  .then(() => {
    console.log('plan inserted.');
    process.exit();
  });

}
