#!/usr/bin/env node
import { ObjectId } from 'mongodb';

import '../bootstrap';
import program from 'commander';
import db from 'lib/database';

program
  .option('-o, --oauth', 'insert oauth clients')
  .option('--approvaltemplate', 'insert approval default templates')
  .parse(process.argv);

console.log('database initialization');

if (!program.oauth) {
  program.outputHelp();
}

if (program.oauth) {

  db.oauth.clients.remove({})
  .then(() => {
    return db.oauth.clients.insert([
      {
        client_id: 'webapp',
        client_secret: '1234567890',
      },
      {
        client_id: 'com_tlifang_web',
        client_secret: 'Y=tREBruba$+uXeZaya=eThaD3hukuwu',
      },
      {
        client_id: 'com_tlifang_mobile',
        client_secret: 'zET@AdruTh5?3um38**Tec@ej#dR$8wu',
      },
      {
        client_id: 'com_tlifang_wechat',
        client_secret: 'Kub8EjUYutaMA@agAruBaC+azUQAhUd_',
      },
      {
        client_id: 'com_tlifang_www',
        client_secret: '5@xUphUBru=AyUbU@6BEJaZehus!p6Ma',
        redirect_uri: 'https://www.tlifang.com/user/oauth',
      },
    ]);
  })
  .then(() => {
    console.log('oauth.clients inserted.');
    process.exit();
  });

}

if (program.approvaltemplate) {
  db.approval.template.default.remove({})
  .then(() => {
    return db.approval.template.default.insert([
      {
        name: '请假单',
        description: '请假单介绍',
        icon: '',
        forms: [{
          _id: ObjectId(),
          label: '开始时间',
          type: 'datetime',
          required: true
        }, {
          _id: ObjectId(),
          label: '结束时间',
          type: 'datetime',
          required: true
        }, {
          _id: ObjectId(),
          label: '工作代理人',
          type: 'text',
        }]
      }
    ]);
  })
  .then(() => {
    console.log('approval.template.default inserted.');
    process.exit();
  });
}
