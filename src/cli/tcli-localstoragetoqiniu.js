import '../bootstrap';
import program from 'commander';
import readline from 'readline';
import DB from 'lib/database';
import qiniu from 'qiniu';
import crypto from 'crypto';
import path from 'path';

program
  .option('-c, --collection <name>', 'input collection name') // 指定数据库中要替换的文档集合collection
  .option('--access-key [xxx]', 'qiniu ACCESS_KEY') //
  .option('--secret-key [xxx]', 'qiniu SECRET_KEY') //
  .option('--server-url [xxx]', 'qiniu SERVER_URL') //
  .option('--bucket [xxx]', 'qiniu BUCKET') //
  .parse(process.argv);

console.log('starting local file deploy to qiniu');

let serverUrl = program.serverUrl;
if (!/^https?:\/\/[\w\.\-]+\/$/.test(serverUrl)) {
  console.error('ERROR: invalid server-url' , serverUrl);
  process.exit();
}

if (!program.collection) {
  program.outputHelp();
  console.error('ERROR: the option [-c,--collection <name>] missing');
  process.exit();
}

let dbname = program.collection;
let col, db;
switch (dbname) {
case 'user':
  (col = 'avatar', db = DB.user);
  break;
case 'company':
  (col = 'logo', db = DB.company);
  break;
case 'project':
  (col = 'logo', db = DB.project);
  break;
case 'document.file':
  (col = 'path', db = DB.document.file);
  break;
default:
  console.error('invalid collection name');
  process.exit();
}

// const rl = new readline.createInterface({
//   input: process.stdin,
//   output: process.stdout
// });

// let localDir = program.dir;
// var splitLocalDir = localDir.split('/');
// splitLocalDir.pop() && (localDir = localDir + '/');

let getQiniuConfig = new Promise((resolve, reject) => {
  let config = {
    ACCESS_KEY: program.accessKey,
    SECRET_KEY: program.secretKey,
    SERVER_URL: program.serverUrl,
    BUCKET: program.bucket,
  };
  resolve(config);
  // rl.question('请输入七牛云存储的ACCESS_KEY:\n', ak => {
  //   config.ACCESS_KEY = ak.trim();
  //   rl.question('请输入七牛云存储的SECRET_KEY:\n', sk => {
  //     config.SECRET_KEY = sk.trim();
  //     rl.question('请输入七牛云存储的空间BUCKET:\n', bk => {
  //       config.BUCKET = bk.trim();
  //       rl.question('请输入七牛云存储的空间域名SERVER_URL:\n', su => {
  //         config.SERVER_URL = su;
  //         rl.close();
  //         resolve(config);
  //       });
  //     });
  //   });
  // });
});

getQiniuConfig.then(config => {

  qiniu.conf.ACCESS_KEY = config.ACCESS_KEY;
  qiniu.conf.SECRET_KEY = config.SECRET_KEY;
  qiniu.conf.BUCKET = config.BUCKET;

  let urlReg = /^https?:\/\/([^\/]+)\//;
  db.find({}).then(list => {
    let len = list.length;
    len && list.forEach((item, index) => {

      let filePath = col == 'path' ? item[col] : item[col].replace(urlReg, '');
      console.log(filePath);
      upload(filePath).then(rs => {
        return;
        let upset = {};
        console.time(`替换数据库${config.SERVER_URL}${rs.key}`);

        (dbname != 'document.file') &&
          (upset[col] = `${config.SERVER_URL}${rs.key}`) ||
          (upset = {
            url: `${config.SERVER_URL}${rs.key}`,
            cdn_bucket: config.BUCKET,
            cdn_key: rs.key
          });

        db.update({
          _id: item._id
        }, {
          $set: upset
        }, {
          upsert: true
        }).then(() => {
          console.timeEnd(`替换数据库${config.SERVER_URL}${rs.key}`);
          len--;
          len == 0 && (console.log('文件上传完成'), process.exit());
        });
      });
    });
  }).catch(e => {
    console.error(e);
  });
});

let results = {};
let util = qiniu.util;
let secret = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz=_';
// 上传函数
let upload = function (filePath, cb) {
  if (!/cdn\/upload\//.test(filePath)) {
    return Promise.resolve(null);
  }
  if (!path.isAbsolute(filePath)) {
    filePath = __dirname + '/../../public/' + filePath;
  }
  filePath = path.normalize(filePath);
  console.time(`上传文件${filePath}`);
  // let type = filePath.split('.').pop();
  // let key = 'images/' + crypto.createHmac('sha1', secret).update(filePath).digest('hex');
  // type && (key += `.${type}`);
  let key = filePath.replace(/^.*public\\cdn\\/, '').replace(/\\/g, '/');
  console.log('filePath:', filePath);
  console.log('     key:', key);
  console.log();
  return Promise.resolve(true);
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
    let encodedPutPolicy = util.base64ToUrlSafe(new Buffer(JSON.stringify(putPolicy)).toString('base64'));
    let sign = util.hmacSha1(encodedPutPolicy, qiniu.conf.SECRET_KEY);
    let encodedSign = util.base64ToUrlSafe(sign);
    let uploadToken = `${qiniu.conf.ACCESS_KEY}:${encodedSign}:${encodedPutPolicy}`;

    let extra = new qiniu.io.PutExtra();
    qiniu.io.putFile(uploadToken, key, filePath, extra, (err, ret) => {
      if (err) {
        reject(err);
      } else {
        results[key] = {
          originName: filePath,
          cdn: ret
        };
        resolve(ret);
        console.timeEnd(`上传文件${filePath}`);
      }
    });
  });
};
