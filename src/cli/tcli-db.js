import Promise from 'bluebird';
import mkdirp from 'mkdirp-bluebird';
import moment from 'moment';
import fs from 'fs';

import '../bootstrap';
import program from 'commander';
import { handleError } from './lib/utils';

function backup() {
  const spawn = require('child_process').spawn;
  let dir = `${__dirname}/../../../../backup/mongodb/tlf_core/`;
  let fileDir;
  if (program.tag) {
    fileDir = 'dbdump-tag-' + program.tag;
  } else {
    if (program.lock) {
      fileDir = 'dbdump-' + moment().format('YYYYMMDDHHmmss') + '-lock';
    } else {
      fileDir = 'dbdump-' + moment().format('YYYYMMDDHHmmss');
    }
  }
  let targetDir = dir + fileDir;
  new Promise((resolve,reject)=>{
    return mkdirp(targetDir).then(() => {
      const mongodump = spawn('mongodump', ['--db', 'tlf_core', '--out', `${targetDir}`]);
      let body='';
      let error='';
      mongodump.stdout.on('data', chunk => {
        chunk&&(body+=chunk);
      });
      mongodump.stderr.on('data', chunk => {
        chunk&&(error+=chunk);
      });
      mongodump.on('close', code => {
        console.log(`子进程退出码：${code}`);
        fs.writeFile(`${targetDir}` + '-comments.txt', `${program.comments}`, (err) => {
          if (err) return reject(err);
          if (code) return reject(error);
          resolve(body);
        });
      });
    })
    .catch(handleError);
  }).then(data => {
    const tar = spawn('tar', ['-cf', `${targetDir}.tar`, `${targetDir}`, '--remove-files']);
    let body='';
    let error='';
    tar.stdout.on('data', chunk => {
      chunk&&(body+=chunk);
    });
    tar.stderr.on('data', chunk => {
      chunk&&(error+=chunk);
    });
    tar.on('close', code => {
      console.log(`子进程退出码：${code}`);
    });
  }).catch(handleError);
}

program
  .option('-m, --comments <comments>', 'add backup comment to explain the reason of backup')
  .option('-t, --tag <tag>', 'add tag for restore easily by using tag')
  // .option('-f, --force', 'recover target tag version')
  .option('-l, --lock', 'add lock for invoid clean backup')
  .command('backup')
  .description('backup database using -m for comments which is required, -t -f -l is optional')
  .action(() => {
    backup();
  });

program.parse(process.argv);
