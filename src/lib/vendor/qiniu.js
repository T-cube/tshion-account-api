// TLifang project
// qiniu upload class
// by alphakevin <antmary@126.com>

import path from 'path';
import uuid from 'node-uuid';
import Promise from 'bluebird';
import qiniu from 'qiniu';
import config from 'config';

const fileExists = Promise.promisify(path.exists);
const putFile = Promise.promisify(qiniu.io.putFile);

qiniu.conf.ACCESS_KEY = config.get('vendor.qiniu.ACCESS_KEY');
qiniu.conf.SECRET_KEY = config.get('vendor.qiniu.SECRET_KEY');

export default class Qiniu {

  constructor(bucket) {
    this.bucket = bucket || config.get('vendor.qiniu.bucket');
  }

  getToken(key) {
    var putPolicy = new qiniu.rs.PutPolicy(this.bucket + ':' + key);
    return putPolicy.token();
  }

  async upload(filePath) {
    exists = await fileExists(filePath);
    if (!exists) {
      throw new Error('file not exists!');
    }
    let extname = path.extname(filePath);
    let basename = uuid.v4();
    let key = basename + extname;
    let uptoken = this.getToken(key);
    var extra = new qiniu.io.PutExtra();
    return putFile(uptoken, key, filePath, extra);
  }

}
