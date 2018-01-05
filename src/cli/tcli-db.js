import Promise from 'bluebird';
import mkdirp from 'mkdirp-bluebird';
import moment from 'moment';
// import fs from 'fs';
import path from 'path';
import _ from 'underscore';
const fs = Promise.promisifyAll(require('fs'));
import { ObjectId } from 'mongodb';

import '../bootstrap';
import program from 'commander';
import { handleError } from './lib/utils';
import db from 'lib/database';

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

function member() {
  return db.company.find({}, {members: 1, structure: 1})
  .then(companies => {
    return Promise.map(companies, company => {
      let all_member = _.pluck(company.members, '_id');
      let root_node_member = _.pluck(company.structure.members, '_id');
      let need_add_member = [];
      let flag;
      if (!root_node_member.length) {
        all_member.forEach(item => {
          need_add_member.push({
            _id: item
          });
        });
      } else {
        for (let i = 0; i < all_member.length; i++) {
          flag = false;
          for (let m = 0; m < root_node_member.length; m++) {
            if (all_member[i].equals(root_node_member[m])) {
              flag = true;
            }
            if ((m == root_node_member.length - 1) && !flag) {
              need_add_member.push({_id: all_member[i]});
            }
          }
        }
      }
      let total_members = [].concat(company.structure.members, need_add_member);
      return db.company.update({
        _id: company._id
      }, {
        $set: {
          'structure.members': total_members
        }
      })
      .then(() => {
        console.log('1 company complete');
      });
    })
    .then(() => {
      console.log('update complete, starting check');
      return Promise.map(companies, item => {
        return db.company.findOne({
          _id: item._id
        }, {
          members: 1,
          structure: 1
        })
        .then(company => {
          if (company.structure.members.length < company.members.length) {
            console.log('1 error occured');
            return fs.appendFile(__dirname + '/../../failedCompanyList.log', company._id.toString() + ',');
          }
        });
      });
    });
  });
}

function initMember() {
  let positions = ['CEO', 'CTO', 'COO', 'designer', 'manager', 'engineer', 'hoter'];
  return db.company.find({}, {members: 1, structure: 1})
  .then(companies => {
    return Promise.map(companies, company => {
      let length = company.members.length;
      let random = Math.ceil(length * Math.random());
      let position_random = Math.ceil(positions.length * Math.random());
      let random_position = positions.sort((a, b) => Math.random()>0.5 ? -1 : 1);
      let origin_member = company.members.sort((a, b) => Math.random()>0.5 ? -1 : 1);
      let company_positions = [];
      let company_members = [];
      for (let i = 0; i < position_random; i++) {
        company_positions.push({
          _id: ObjectId(),
          title: random_position[i]
        });
      }
      for (let i = 0; i < (position_random < origin_member.length ? position_random : origin_member.length); i++) {
        company_members.push({
          _id: origin_member[i]._id,
          position: company_positions[i]._id
        });
      }
      return db.company.update({
        _id: company._id
      }, {
        $set: {
          'structure.positions': company_positions,
          'structure.members': company_members
        }
      })
      .then(() => {
        console.log('1 company complete');
      });
    });
  });
}

function initstructure() {
  return db.company.find({}, {name: 1, structure: 1, members: 1})
  .then(companies => {
    return Promise.map(companies, company => {
      let structure = {
        _id: ObjectId(),
        children: [],
        positions: [],
        members: [],
        name: company.name
      };
      return db.company.update({
        _id: company._id
      }, {
        $set: {
          structure
        }
      })
      .then(() => {
        console.log('1 company complete');
      });
    });
  });
}

function insertChildrenStructure(children) {
  if (!children || !children.length) {
    return [];
  }
  return Promise.map(children, child => {
    var doc = {
      _id: child._id || ObjectId(),
      name: child.name || '新部门',
      positions: child.positions || [],
      members: child.members || [],
      admin: child.admin || null,
      children: child.children ? _.pluck(child.children, '_id') : []
    };
    return Promise.all([
      db.structure.insert(doc),
      insertChildrenStructure(child.children)
    ]);
  });
}

function transfer(options) {
  return db.company.find({}, {structure: 1, name: 1, owner: 1})
  .then(companies => {
    return Promise.map(companies, company => {
      let root_id = company.structure._id ? company.structure._id : ObjectId();
      var root = {
        _id: root_id,
        name: company.structure.name || company.name,
        positions: company.structure.positions || [],
        members: company.structure.members || [],
        admin: company.structure.admin || company.owner,
        children: company.structure.children ? _.pluck(company.structure.children, '_id') : []
      };
      return Promise.all([
        db.structure.insert(root),
        insertChildrenStructure(company.structure.children),
        db.company.update({
          _id: company._id
        }, {
          $set:{ structure: root_id }
        })
      ]);
    });
  });
}

program
  .command('transfer')
  .description('transfer company structure to a new collection')
  // .option()
  .action(options => {
    transfer(options)
    .then(() => {
      console.log('transfer complete');
      process.exit();
    });
  });

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
      process.exit(0);
    });
  });

program
  .command('clean')
  .description('clean data')
  .option('-d, --days <days>', 'clean before <days> data')
  .option('--all', 'clean all data')
  .action((options) => {
    clean(options);
    process.exit(0);
  });

program
  .command('restore')
  .description('restore db')
  .option('-t --tag <tag>', 'restore tag name')
  .option('-f --file <file>', 'restore file name without extend name')
  .action((options) => {
    restore(options);
    process.exit(0);
  });

program
  .command('member')
  .description('put all company members into structure root node members')
  .action(() => {
    member()
    .then(() => {
      console.log('all done');
      process.exit(0);
    });
  });

program
  .command('initmember')
  .description('clear structure root node members for test')
  .action(() => {
    initMember()
    .then(() => {
      console.log('all done');
      process.exit(0);
    });
  });

program
  .command('init')
  .description('init structure')
  .action(() => {
    initstructure()
    .then(() => {
      console.log('all done');
    });
  });


program.parse(process.argv);
