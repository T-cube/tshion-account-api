import { ObjectId } from 'mongodb';
import Promise from 'bluebird';
import xlsx from 'node-xlsx';
import fs from 'fs';
import _ from 'underscore';
import mkdirp from 'mkdirp-bluebird';

import config from 'config';
import '../bootstrap';
import program from 'commander';
import db from 'lib/database';
import approvalTemplate from './config/approval-template';
import planData from './config/plan';
import oauthClient from './config/oauth-clients';
import { handleError } from './lib/utils';


function testLink() {
  let dir = `${__dirname}/../../public/cdn/upload/attachment`;
  let files = [];
  try{
    files = fs.readdirSync(dir);
  } catch (e) {
    return Promise.reject(e);
  }
  return Promise.map(files, (file) => {
    if (!fs.statSync(`${dir}/`+file).isFile()) {
      return {};
    }
    let first = file[0];
    let second = file[1];
    let third = file[2];
    try {
      fs.statSync(`${dir}/${first}/${second}/${third}/`);
    } catch(e) {
      return mkdirp(`${dir}/${first}/${second}/${third}`).then(() => {
        try {
          return fs.renameSync(`${dir}/` + file , `${dir}/${first}/${second}/${third}/` + file);
        } catch(e) {
          throw new Error(e);
        }
      })
      .catch(err => {
        throw new Error(err);
      });
    }
    return fs.renameSync(`${dir}/` + file , `${dir}/${first}/${second}/${third}/` + file);
  });
}

program
  .command('class-file')
  .description('read current dir & files & class')
  .action(() => {
    testLink()
    .then(() => {
      process.exit(0);
    })
    .catch(handleError);
  });

program.parse(process.argv);
