import qiniu from 'qiniu';
import request from 'request';
import _ from 'underscore';
import Promise from 'bluebird';
import crypto from 'crypto';
const util = qiniu.util;

export default class Qiniu {

  constructor(options) {
    if (!(('ACCESS_KEY' in options) &&
        ('SECRET_KEY' in options) &&
        ('BUCKET' in options) &&
        ('SERVER_URL' in options))) {
      throw new Error('qiniu missing options, must contains ACCESS_KEY, SECRET_KEY, BUCKET, SERVER_URL');
    }
    this.conf = _.defaults(options, {
      TOKEN_EXPIRE: 600,
      TOKEN_CACHE_EXPIRE: 590,
    });
    this.redis = options.redis;
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

  getThumnailUrl(url, size) {
    if (!/^http/.test(url)) {
      url = this.conf.SERVER_URL + url;
    }
    if (!/^\d+$/.test(size)) {
      throw new Error('getThumnailUrl: invalid thumbnail size');
    }
    let find = /\/thumbnail\/\d+/;
    let replace = `/thumbnail/${size}`;
    if (find.test(url)) {
      url = url.replace(find, replace);
    } else {
      if (!/\?/.test(url)) {
        url += '?imageMogr2';
      }
      url += replace;
    }
    if (this.conf.isPrivate) {
      return this.makeLink(url);
    }
    return Promise.resolve(url);
  }

  // 生成下载链接
  makeLink(key, deadTime, delay, downloadName) {
    let self = this;
    // 检测链接失效时间参数和延迟时间
    if (typeof deadTime !== 'number') {
      downloadName = deadTime;
      deadTime = self.conf.TOKEN_EXPIRE;
      delay = self.conf.TOKEN_CACHE_EXPIRE;
    }
    if (typeof delay !== 'number') {
      downloadName = delay;
      delay = deadTime - 10;
    }
        
    return new Promise((resolve, reject) => {
      // 如果启用redis
      if (self.redis) {
        // 检查redis缓存中是否存在
        let sha1 = crypto.createHash('sha1');
        // let REDIS_KEY = `CDN_URL:${self.conf.BUCKET}:${key}`;
        let REDIS_KEY = 'cdn_url:' + sha1.update(`${self.conf.BUCKET}:${key}:${downloadName||''}`).digest('hex');
        self.redis.get(REDIS_KEY, (err, res) => {
          if (err) {
            reject(err);
            return;
          }
          if (res) {
            // redis中存在链接，直接返回
            resolve(res);
          } else {
            // redis中不存在链接，创建新链接
            let downloadUrl = self.generateLink.call(self, key, deadTime, delay, downloadName);
            // redis缓存这个链接
            self.redis.set(REDIS_KEY, downloadUrl, (err, obj) => {
              self.redis.expire(REDIS_KEY, delay);
              err ? reject(err) : resolve(downloadUrl);
            });
          }
        });
      } else {
        let downloadUrl = self.generateLink(key, deadTime, delay, downloadName);
        resolve(downloadUrl);
      }
    });
  }

  generateLink(key, deadTime, delay, downloadName) {
    let self = this;

    // 构建私有空间的链接
    let url = key.indexOf('http') == 0 ? key : `${self.conf.SERVER_URL}${key}`;

    // 命名下载资源名
    downloadName && (url += `?download/${encodeURIComponent(downloadName)}`);

    // 指定授权失效时间
    let e = Math.floor((+new Date) / 1000) + deadTime;
    url += url.indexOf('?') > 0 && `&e=${e}` || `?e=${e}`;

    // 生成下载token
    let signature = util.hmacSha1(url, self.conf.SECRET_KEY);
    let encodedSign = util.base64ToUrlSafe(signature);
    let downloadToken = `${self.conf.ACCESS_KEY}:${encodedSign}`;
    // 生成下载链接
    let downloadUrl = `${url}&token=${downloadToken}`;

    return downloadUrl;
  }

  // 批量生成访问链接
  batchLinks(keys, deadTime) {
    let self = this;
    let items = _.map(keys, item => {
      if (_.isString(item)) {
        return {
          key: item,
        };
      } else if (_.isObject(item) && (item.key || item.url)) {
        return {
          key: item.key || item.url,
          name: item.name,
        };
      } else {
        throw new Error('batchLinks: invalid keys');
      }
    });
    return Promise.map(items, item => {
      return self.makeLink(item.key, deadTime, item.name);
    }).then(links => {
      return _.object(_.pluck(items, 'key'), links);
    });
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
      return `op=/${option}/${util.base64ToUrlSafe(new Buffer(entry).toString('base64'))}`;
    });
    // 数据拼接url
    let urlBody = postArray.join('&');

    // 生成管理token凭证
    let accessToken = util.generateAccessToken(url, urlBody);

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
    // console.log(putPolicy);
    // 对putOolicy进行加密签名
    let encodedPutPolicy = util.base64ToUrlSafe(new Buffer(JSON.stringify(putPolicy)).toString('base64'));
    let sign = util.hmacSha1(encodedPutPolicy, app.conf.SECRET_KEY);
    let encodedSign = util.base64ToUrlSafe(sign);
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
