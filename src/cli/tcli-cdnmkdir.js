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
    let first = file[0];
    let second = file[1];
    let third = file[2];
    console.log(`${dir}/${first}/${second}/${third}`);
    return mkdirp(`${dir}/${first}/${second}/${third}`).then(made => {
      console.log(made);
      return made;
    })
    .catch(err => {
      throw new Error(err);
    });
  });
}

program
  .command('test-current')
  .description('read current dir & files')
  .action(() => {
    testLink()
    .then(() => {
      process.exit(0);
    })
    .catch(handleError);
  });

program.parse(process.argv);
