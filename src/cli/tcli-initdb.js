#!/usr/bin/env node

import '../bootstrap';
import program from 'commander';
import db from 'lib/database';

program
  .option('-o, --oauth', 'insert oauth clients')
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
        redirect_uri: 'http://www.tlifang.com/oauth/entry',
      },
    ]);
  })
  .then(() => {
    console.log('oauth.clients inserted.');
    process.exit();
  });

}
