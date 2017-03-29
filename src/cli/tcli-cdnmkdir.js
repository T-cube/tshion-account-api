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
import { dirPathConfig } from 'lib/utils';


function fileDir() {
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
    let filePath = dirPathConfig(file);
    try {
      fs.statSync(`${dir}/${filePath}/`);
    } catch(e) {
      return mkdirp(`${dir}/${filePath}`).then(() => {
        try {
          return fs.renameSync(`${dir}/` + file , `${dir}/${filePath}/` + file);
        } catch(e) {
          throw new Error(e);
        }
      })
      .catch(err => {
        throw new Error(err);
      });
    }
    return fs.renameSync(`${dir}/` + file , `${dir}/${filePath}/` + file);
  });
}

function databaseDir() {
  return db.document.file.find({}, {relpath: 1, _id: 1}).then(list => {
    return Promise.map(list, item => {
      if(/^upload\/attachment\//.test(item.relpath)) {
        let fileName = item.relpath.replace(/^upload\/attachment\//,'');
        let filePath = dirPathConfig(fileName);
        let newPath = 'upload/attachment/' + filePath + fileName;
        return db.document.file.update({
          _id: item._id
        }, {
          $set: {
            relpath: newPath
          }
        });
      }
    });
  });
}

program
  .command('class-file')
  .description('read current dir & files & class')
  .action(() => {
    fileDir()
    .then(() => {
      process.exit(0);
    })
    .catch(handleError);
  });

program
  .command('database-dir')
  .description('change database path')
  .action(() => {
    databaseDir()
    .then(() => {
      process.exit(0);
    })
    .catch(handleError);
  });

program.parse(process.argv);
