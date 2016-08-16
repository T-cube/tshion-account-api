import qiniu from 'qiniu';
import request from 'request';
import urlLib from 'url';
import _ from 'underscore';

export default class Qiniu {

  constructor(options) {
    if (!(('ACCESS_KEY' in options) &&
        ('SECRET_KEY' in options) &&
        ('BUCKET' in options) &&
        ('SERVER_URL' in options))) {
      throw new Error('qiniu missing options, must contains ACCESS_KEY, SECRET_KEY, BUCKET, SERVER_URL');
    }
    this.conf = options;
    qiniu.conf.ACCESS_KEY = options.ACCESS_KEY;
    qiniu.conf.SECRET_KEY = options.SECRET_KEY;
    // 构建七牛bucketManager对象
    this.qiniuClient = new qiniu.rs.Client();
  }

  createIncetance(options) {
    _.defaults(options, this.conf);
    return new Qiniu(options);
  }

  // 上传文件
  upload(savekey, filePath, cb) {
    let self = this;
    console.info('qiniu：uploading file', savekey, filePath);
    // 生成别名
    // let SplitArr = savekey.split('.') || [];
    // let type = SplitArr.pop();
    // let key = Math.random().toString(36).substr(2, 6) + (new Date()).getTime().toString(36) + (new Buffer(savekey + '')).toString('base64');
    // key += type ? `.${type}` : '';
    // 生成上传token
    //let token = this.getUploadToken(key, self);
    let key = savekey;
    let token = this.getUploadToken(key, self);
    // 上传文件
    return new Promise(function(resolve, reject) {
      self.uploadFile(token, key, filePath).then(data => {
        data.server_url = self.conf.SERVER_URL;
        typeof cb == 'function' && cb(null, data);
        resolve(data);
        return data;
      }, err => {
        typeof cb == 'function' && cb(err);
        reject(err);
      });
    });
  }

  // 获取元文件信息
  getStat(key, cb) {
    let self = this;
    return new Promise((resolve, reject) => {
      self.qiniuClient.stat(self.conf.BUCKET, key, (err, ret) => {
        typeof cb == 'function' && cb(ret, err);
        if (!err) {
          resolve(ret);
        } else {
          reject(err);
        }
      });
    });
  }

  // 删除单个文件
  delete(key, cb) {
    let self = this;
    return new Promise((resolve, reject) => {
      self.qiniuClient.remove(self.conf.BUCKET, key, (err, ret) => {
        typeof cb == 'function' && cb(ret, err);
        if (!err) {
          resolve(ret);
        } else {
          reject(err);
        }
      });
    });
  }

  // 生成下载链接
  makeLink(key, deadTime, downloadName) {
    let self = this;
    // 构建私有空间的链接
    if (typeof key !== 'string') {
      return Promise.resolve(null);
    }
    let url = key.indexOf('http') == 0 ? key : `${self.conf.SERVER_URL}${key}`;

    // 检测链接失效时间参数
    (deadTime && isNaN(parseInt(deadTime))) && (downloadName = deadTime, deadTime = 0);

    // 命名下载资源名
    downloadName && (url += `?download/${encodeURIComponent(downloadName)}`);

    // 指定授权失效时间
    let e = Math.floor((deadTime || (+new Date + 1000 * 60 * 10)) / 1000);
    url += url.indexOf('?') > 0 && `&e=${e}` || `?e=${e}`;

    // 生成下载token
    let signature = qiniu.util.hmacSha1(url, self.conf.SECRET_KEY);
    let encodedSign = qiniu.util.base64ToUrlSafe(signature);
    let downloadToken = `${self.conf.ACCESS_KEY}:${encodedSign}`;

    // 生成下载链接
    let downloadUrl = `${url}&token=${downloadToken}`;

    //打印下载的url
    return downloadUrl;
  }

  // 批量删除
  batchDelete(...args) {
    return this.batchHandle('delete', ...args);
  }

  // 批量获取元信息
  batchStat(...args) {
    return this.batchHandle('stat', ...args);
  }

  // 批量操作
  batchHandle(option, sourceArray, cb) {
    // 批量接口path
    let url = 'http://rs.qiniu.com/batch';
    // 对数据进行编码
    let postArray = sourceArray.map((item) => {
      let entry = item.indexOf(':') > 0 && item || `${this.conf.BUCKET}:${item}`;
      return `op=/${option}/${qiniu.util.base64ToUrlSafe(new Buffer(entry).toString('base64'))}`;
    });
    // 数据拼接url
    let urlBody = postArray.join('&');

    // 生成管理token凭证
    let accessToken = qiniu.util.generateAccessToken(url, urlBody);

    // 指定参数
    let options = {
      url: url,
      method: 'post',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `${accessToken}`
      },
      body: urlBody
    };
    return new Promise(function(resolve, reject) {
      request(options, function(err, res, body) {
        typeof cb == 'function' && cb(err, body);
        if (!err) {
          resolve(body);
        } else {
          reject(err);
        }
      });
    });
  }

  // 构建上传策略函数，设置回调的url以及需要回调给业务服务器的数据
  // private method
  getUploadToken(key, app) {
    let putPolicy = {
      scope: `${app.conf.BUCKET}:${key}`,
      deadline: Math.floor(+new Date) + 3600,
    };
    console.log(putPolicy);
      // 对putOolicy进行加密签名
    let encodedPutPolicy = qiniu.util.base64ToUrlSafe(new Buffer(JSON.stringify(putPolicy)).toString('base64'));
    let sign = qiniu.util.hmacSha1(encodedPutPolicy, app.conf.SECRET_KEY);
    let encodedSign = qiniu.util.base64ToUrlSafe(sign);
    let uploadToken = `${app.conf.ACCESS_KEY}:${encodedSign}:${encodedPutPolicy}`;

    // 上传完成的回调地址，默认不启用自定义，交由七牛官方处理上传数据
    // putPolicy.callbackUrl = 'http://domain/qiniucallback';
    // putPolicy.callbackBody = 'filename=$(fname)&filesize=$(fsize)';
    return uploadToken;
  }

  // 构造上传函数,通过创建Promise，处理异步上传工作
  // private method
  uploadFile(uptoken, key, localFile) {
    return new Promise(function(resolve, reject) {
      let extra = new qiniu.io.PutExtra();
      qiniu.io.putFile(uptoken, key, localFile, extra, function(err, ret) {
        if (!err) {
          resolve(ret);
        } else {
          reject(err);
        }
      });
    });
  }

}
