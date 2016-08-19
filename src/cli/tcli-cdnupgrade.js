import '../bootstrap';
import fs from 'fs';
import program from 'commander';
import DB from 'lib/database';
import qiniu from 'qiniu';
import path from 'path';
import config from 'config';
import Promise from 'bluebird';
import _ from 'underscore';
import moment from 'moment';

import { fileExists } from 'lib/utils';

const BASE_PATH = __dirname + '/../../';

program
  .option('-c, --collection <name>', 'input collection name') // 指定数据库中要替换的文档集合collection
  .option('--access-key [xxx]', 'qiniu ACCESS_KEY') //
  .option('--secret-key [xxx]', 'qiniu SECRET_KEY') //
  .option('--server-url [xxx]', 'qiniu SERVER_URL') //
  .option('--bucket [xxx]', 'qiniu BUCKET') //
  .parse(process.argv);

if (!program.collection) {
  program.outputHelp();
  process.exit(0);
}

let collectionName = program.collection;
let schema = {};
switch (collectionName) {
case 'user':
  schema = {
    field: 'avatar',
    collection: DB.user,
    bucket: 'cdn-public',
  };
  break;
case 'company':
  schema = {
    field: 'logo',
    collection: DB.company,
    bucket: 'cdn-public',
  };
  break;
case 'project':
  schema = {
    field: 'logo',
    collection: DB.project,
    bucket: 'cdn-public',
  };
  break;
case 'document.file':
  schema = {
    field: 'url',
    collection: DB.document.file,
    bucket: 'cdn-file',
  };
  break;
default:
  console.error('ERROR: invalid collection name');
  process.exit(1);
}
console.log('processing collection: "%s"\n', collectionName);

function run() {
  const projectConfig = config.get('vendor.qiniu');
  let bucketConfig = projectConfig.buckets[schema.bucket];
  if (program.bucket && !program.serverUrl) {
    console.error('ERROR: server-url missing while bucket is provided');
    process.exit(1);
  }
  let cfg = {
    ACCESS_KEY: program.accessKey || projectConfig.ACCESS_KEY,
    SECRET_KEY: program.secretKey || projectConfig.SECRET_KEY,
    BUCKET: program.bucket || bucketConfig.name,
    SERVER_URL: program.serverUrl || ((bucketConfig.https ? 'https' : 'http') + '://' + bucketConfig.domain + '/'),
  };
  qiniu.conf.ACCESS_KEY = cfg.ACCESS_KEY;
  qiniu.conf.SECRET_KEY = cfg.SECRET_KEY;
  qiniu.conf.BUCKET = cfg.BUCKET;

  console.log('qiniu config:');
  console.log(cfg);
  console.log();
  console.log('preparing file list...\n');


  schema.collection.find({}, {[schema.field]: 1})
  .then(list => {
    let files = [];
    _.each(list, item => {
      let fileUrl = item[schema.field];
      let params = getUploadParams(fileUrl);
      if (params) {
        files.push(_.extend(item, params));
      }
    });
    //console.log('file list:');
    console.log(_.map(files, f => f.key).join('\n'));
    console.log();
    return Promise.reduce(files, (result, file) => {
      console.log('sending %s ...', file.key);
      // return Promise.resolve(file);
      let upset = {};
      return upload(file.key, file.filePath)
      .then(rs => {
        if (!rs) {
          return null;
        }
        console.log('ok!');
        // return;
        let url = `${cfg.SERVER_URL}${rs.key}`;
        console.time(`updating url ${url}`);
        if (collectionName == 'document.file') {
          upset[schema.field] = url;
        } else {
          upset = {
            [schema.field]: url,
            cdn_bucket: config.BUCKET,
            cdn_key: rs.key
          };
        }
        return schema.collection.update({
          _id: file._id
        }, {
          $set: upset
        });
      })
      .then(data => {
        if (!data) {
          upset.error = 'upload failed';
        } else {
          upset.ok = true;
        }
        return result.concat(_.extend(file, upset));
      });
    }, []);
  })
  .then(result => {
    let content = JSON.stringify(result, null, 2);
    let logFile = `temp/qiniu-upgrade-[${collectionName}]-${moment().format('YYYYMMDD-HHmmss')}.log`;
    fs.writeFileSync(BASE_PATH + logFile, content);
    let stats = _.countBy(result, f => f.ok ? 'success' : 'error');
    console.log();
    console.log(`all done: total ${result.length} processed, ${stats.success || 0} upgraded, ${stats.error || 0} failed`);
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
}

function getUploadParams(filePath) {
  if (!/cdn\/upload\//.test(filePath)) {
    return null;
  }
  filePath = filePath.replace(urlReg, '');
  if (!path.isAbsolute(filePath)) {
    filePath = BASE_PATH + 'public/' + filePath;
  }
  filePath = path.normalize(filePath);
  // let type = filePath.split('.').pop();
  // let key = 'images/' + crypto.createHmac('sha1', secret).update(filePath).digest('hex');
  // type && (key += `.${type}`);
  let key = path.relative(BASE_PATH + 'public/cdn/', filePath).replace(/\\/g, '/');
  // console.log('  cdn_key:', key);
  // console.log('file_path:', filePath);
  // console.log();
  return {
    key,
    filePath,
  };
}

const urlReg = /^https?:\/\/([^\/]+)\//;

function upload(key, filePath) {
  return fileExists(filePath)
  .then(exists => {
    if (!exists) {
      console.log('file not exists: %s', filePath);
      return;
    }
    return new Promise((resolve, reject) => {
      if (results.hasOwnProperty(key)) {
        resolve(results[key].cdn);
        return;
      }
      // 构建上传策略
      let putPolicy = {
        scope: `${qiniu.conf.BUCKET}:${key}`,
        deadline: Math.floor((+new Date) / 1000) + 3600
      };
      let encodedPutPolicy = qiniu.util.base64ToUrlSafe(new Buffer(JSON.stringify(putPolicy)).toString('base64'));
      let sign = qiniu.util.hmacSha1(encodedPutPolicy, qiniu.conf.SECRET_KEY);
      let encodedSign = qiniu.util.base64ToUrlSafe(sign);
      let uploadToken = `${qiniu.conf.ACCESS_KEY}:${encodedSign}:${encodedPutPolicy}`;

      let extra = new qiniu.io.PutExtra();
      qiniu.io.putFile(uploadToken, key, filePath, extra, (err, ret) => {
        if (err) {
          reject(err);
        } else {
          results[key] = {
            key: filePath,
            path: filePath,
            cdn: ret
          };
          resolve(ret);
        }
      });
    });
  });
}

let results = {};

run();
