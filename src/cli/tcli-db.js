import Promise from 'bluebird';
import mkdirp from 'mkdirp-bluebird';
import moment from 'moment';
// import fs from 'fs';
import path from 'path';
import _ from 'underscore';
const fs = Promise.promisifyAll(require('fs'));

import '../bootstrap';
import program from 'commander';
import { handleError } from './lib/utils';

function backup(options) {
  const spawn = require('child_process').spawn;
  let dir = path.normalize(`${__dirname}/../../../../backup/mongodb/tlf_core`);
  let fileDir;
  if (options.tag) {
    fileDir = 'dbdump-tag-' + options.tag;
  } else {
    if (options.lock) {
      fileDir = 'dbdump-' + moment().format('YYYYMMDDHHmmss') + '-lock';
    } else {
      fileDir = 'dbdump-' + moment().format('YYYYMMDDHHmmss');
    }
  }
  let targetDir = dir + '/' + fileDir;
  const logFilename = `${targetDir}.log`;
  const errFilename = `${targetDir}.error.log`;
  return mkdirp(targetDir)
  .then(() => {
    const mongodump = spawn('mongodump', ['--db', 'tlf_core', '--out', fileDir], {cwd: dir});
    const outStream = fs.createWriteStream(logFilename);
    const errStream = fs.createWriteStream(errFilename);
    outStream.write(options.comments + '\n');
    mongodump.stdout.pipe(outStream);
    mongodump.stderr.pipe(errStream);
    return new Promise((resolve,reject) => {
      mongodump.on('close', code => {
        if (code) return reject();
        resolve();
      });
    });
  })
  .then(data => {
    const archive = `${fileDir}.tar.gz`;
    const tar = spawn('tar', ['-czf', '../' + archive, 'tlf_core', '--remove-files'], {cwd: dir + '/' + fileDir });
    const outStream = fs.createWriteStream(logFilename, {flags: 'a'});
    const errStream = fs.createWriteStream(errFilename, {flags: 'a'});
    tar.stdout.pipe(outStream);
    tar.stderr.pipe(errStream);
    return new Promise((resolve, reject) => {
      tar.on('close', code => {
        const exec = require('child_process').exec;
        exec(`rm -rf ${fileDir}`, {cwd: dir}, (error, stdout, stderr) => {
          resolve();
        });
      });
    });
  }).catch(handleError);
}

function clean(options) {
  if (!options.days && !options.all) {
    throw new Error('need input days for clean');
  }
  let dir = path.normalize(`${__dirname}/../../../../backup/mongodb/tlf_core`);
  let target = moment().subtract(options.days ? options.days : 0, 'day').startOf('day').format('YYYYMMDD');
  return fs.readdirAsync(dir).then((files) => {
    _.map(files, file => {
      if (options.all) {
        fs.unlink(dir + '/' + file);
      } else {
        if (parseInt(file.substring(7,15)) < parseInt(target)) {
          if (!/^test/.test(file)) {
            fs.unlink(dir + '/' + file);
          }
        }
      }
    });
  });
}

function restore(options) {
  if (!options.file && !options.tag) {
    throw new Error('need input -n or -t for name to restoer');
  }
  const spawn = require('child_process').spawn;
  let dir = path.normalize(`${__dirname}/../../../../backup/mongodb/tlf_core`);
  fs.readdir(dir, (err, files) => {
    let name;
    if (options.file) {
      name = new RegExp(options.file + '.tar.gz');
    } else {
      name = new RegExp(`dbdump-tag-${options.tag}.tar.gz`);
    }
    let target = _.filter(files, file => {
      if (name.test(file)) {
        return file;
      }
    });
    if (!target.length) {
      throw new Error('can not search input file');
    } else {
      new Promise((resolve, reject) => {
        const tarx = spawn('tar', ['-xzf', target[0]], {cwd: dir});
        tarx.on('close', code => {
          if (code) return reject();
          resolve();
        });
      })
      .then(() => {
        options.comments = 'before restore dump';
        backup(options).then(() => {
          const mongorestore = spawn('mongorestore', ['--drop', '--db', 'tlf_core', 'tlf_core'], {cwd: dir});
          mongorestore.stdout.pipe(process.stdout);
          mongorestore.stderr.pipe(process.stderr);
          mongorestore.on('close', code => {
            const exec = require('child_process').exec;
            exec('rm -rf tlf_core', {cwd: dir}, (error, stdout, stderr) => {
              console.log('delete tarx data');
            });
            console.log('restore complete');
          });
        });
      })
      .catch(handleError);
    }
  });
}

program
  .command('backup')
  .description('backup database using -m for comments which is required, -t -f -l is optional')
  .option('-m, --comments <comments>', 'add backup comment to explain the reason of backup')
  .option('-t, --tag <tag>', 'add tag for restore easily by using tag')
  // .option('-f, --force', 'recover target tag version')
  .option('-l, --lock', 'add lock for invoid clean backup')
  .action((options) => {
    backup(options)
    .then(() => {
      console.log('backup complete');
    });
  });

program
  .command('clean')
  .description('clean data')
  .option('-d, --days <days>', 'clean before <days> data')
  .option('--all', 'clean all data')
  .action((options) => {
    clean(options);
  });

program
  .command('restore')
  .description('restore db')
  .option('-t --tag <tag>', 'restore tag name')
  .option('-f --file <file>', 'restore file name without extend name')
  .action((options) => {
    restore(options);
  });


program.parse(process.argv);
