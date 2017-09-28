import qiniu from 'qiniu';
import request from 'request';
import _ from 'underscore';
import Promise from 'bluebird';
import crypto from 'crypto';
import URL from 'url';
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
    this.qiniuClient = new qiniu.rs.BucketManager();
  }

  createIncetance(options) {
    _.defaults(options, this.conf);
    return new Qiniu(options);
  }

  /**
    * switch qiniu bucket
    * @param {Object} options
    * @param {String} options.BUCKET
    * @param {String} options.SERVER_URL
    */
  switchBUCKET(options) {
    let self = this;
    self.conf.BUCKET = options.BUCKET;
    self.conf.SERVER_URL = options.SERVER_URL;
  }

  getThumbnailUrl(url, width, height) {
    if (!/^http/.test(url)) {
      url = this.conf.SERVER_URL + url;
    }
    width = parseInt(width);
    if (undefined === height) {
      height = width;
    } else {
      height = parseInt(height);
    }
    if (!/^\d+$/.test(width + '' + height)) {
      throw new Error('getThumbnailUrl: invalid thumbnail size');
    }
    let find = /\?.+/;
    let replace = `?imageView2/1/w/${width}/h/${height}`;
    if (find.test(url)) {
      url = url.replace(find, replace);
    } else {
      url += replace;
    }
    if (this.conf.isPrivate) {
      return this.makeLink(url);
    }
    return Promise.resolve(url);
  }

   /**
    * generate upload params
    *
    * @param {String} savekey
    * @param {Array} folder
    * @param {String} rename
    * @param {Function} cb
    * @returns
    * @memberof QINIU
    */
  _generateUploadParams(savekey, folder, rename, cb) {
    // 生成别名
    let SplitArr = savekey.split('.') || [];
    let key = savekey;
    if (!(rename == false)) {
      let type = SplitArr.pop();
      key = Math.random().toString(36).substr(2, 6) + (+new Date).toString(36) + (new Buffer(savekey + '')).toString('base64');
      key += type ? `.${type}` : '';
    }

    // 判断folder
    if (folder) {
      if (typeof folder == 'object') key = `${folder.join('/')}/${key}`;
      else if (typeof folder == 'boolean') {
        rename = folder;
        cb = rename;
      } else cb = folder;
      if (rename) {
        if (typeof rename == 'function') cb = rename;
      }
    }

    return { key, callback: cb };
  }
   /**
    * 上传文件
    * @param {String} savekey
    * @param {String} filePath
    * @param {Array} folder
    * @param {String} rename
    * @param {Function} cb
    */
  upload(savekey, filePath, folder, rename, cb) {
    let self = this;
    // console.info("正在上传文件：", savekey, filePath);

    var { key, callback } = this._generateUploadParams(savekey, folder, false, cb);
    // 生成上传token
    var token = uptoken(key, self);

    // 上传文件
    return new Promise((resolve, reject) => {
      uploadFile(token, key, filePath).then(data => {
        data.server_url = self.conf.SERVER_URL;
        data.url = self.conf.SERVER_URL + savekey;
        typeof callback == 'function' && callback(null, data);
        resolve(data);
      }, err => {
        typeof callback == 'function' && callback(err);
        reject(err);
      });
    });
  }
   /**
    * file stream upload
    *
    * @memberof QINIU
    */
  streamUpload(savekey, stream, folder, rename, cb) {
    let self = this;

    var { key, callback } = this._generateUploadParams(savekey, folder, rename, cb);

    var token = uptoken(key, self);

    return new Promise(function(resolve, reject) {
      uploadStreamFile(token, key, stream).then(data => {
        data.server_url = self.conf.SERVER_URL;
        typeof callback == 'function' && callback(null, data);
        resolve(data);
      }, err => {
        typeof callback == 'function' && callback(err);
        reject(err);
      });
    });
  }

  /**
   * 可以给已经存在于空间中的文件设置文件生存时间，或者更新已设置了生存时间但尚未被删除的文件的新的生存时间。
   * @param {{}} options
   * @param {String} options.bucket
   * @param {String} options.key
   * @param {Number} options.days
   * @memberof QINIU
   */
  deleteAfterDays(options) {
    options || (options = {});
    return new Promise((resolve, reject) => {
      if (typeof options.key !== 'string') { return reject('options.key must be a string'); }
      var days = parseInt(options.days);
      if (isNaN(days)) { return reject('options.days muse be an integet'); }

      this.qiniuClient.deleteAfterDays(options.bucket || this.conf.BUCKET, options.keys, days, function(err, res, info) {
        if (err) return reject(err);

        if (info.statusCode === 200) return resolve(res);

        reject({ info, body: res });
      });
    });
  }

  /**
   * 批量更新文件的有效期
   *
   * @param {{}} options
   * @param {String} options.bucket
   * @param {Array} options.keys
   * @param {Number} options.days
   * @memberof QINIU
   */
  batchDeleteAfterDays(options) {
    options || (options = {});
    return new Promise((resolve, reject) => {
      if (Object.prototype.toString.call(options.keys).replace(/^\[\w+\s|\]/g, '').toLowerCase() !== 'array') { return reject('options.keys must be an array'); }
      var days = parseInt(options.days);
      if (isNaN(days)) { return reject('options.days muse be an integet'); }

      var bucket = options.bucket || this.conf.BUCKET;
      var source = options.keys.map(key => qiniu.rs.deleteAfterDaysOp(bucket, key, days));
      this.qiniuClient.batch(source, function(err, res, info) {
        if (err) return reject(err);

        if (!/^2\d\d$/.test(info.statusCode)) return reject({ info, body: res });

        resolve(res);
      });
    });
  }
   /**
    * 获取文件列表
    * @param {Object} options
    * @param {String} options.bucket
    * @param {String} options.marker
    * @param {Number} options.limit
    * @param {String} options.prefix
    * @param {Function} cb
    */
  getFileList(options, cb) {
    let self = this;
    let url = 'http://rsf.qbox.me/list';

    if (!(typeof options == 'object')) throw new Error('options must be a json has properties [bucket,marker,limit,prefix]');

    // 拼接资源空间
    url += `?bucket=${options.bucket || self.conf.BUCKET}`;

    // 拼接请求数量队列
    url += `&marker=${options.marker || ''}`;
    url += `&limit=${options.limit || 1000}`;

    // 拼接过滤前缀
    options.prefix && (url += `&prefix=${options.prefix}`);

    // 生成管理token凭证
    let accessToken = self._generateAccessToken.call(self, url);

    // 指定请求参数
    let requestOptions = {
      url: url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `${accessToken}`
      },
    };

    return new Promise((resolve, reject) => {
      request(requestOptions, (err, res, body) => {
        typeof cb == 'function' && cb(err, body);
        if (!err) {
          resolve(body);
        } else {
          reject(err);
        }
      });
    });
  }
  /**
   * 获取元文件信息
   * @param {String} key
   * @param {Function} cb
   */
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
  /**
   * 获取照片 EXIF 信息
   *
   * @param {String} key
   * @returns
   * @memberof QINIU
   */
  getExif(key) {
    return new Promise((resolve, reject) => {
      this.makeLink(key).then(link => request.get(`${link}&exif`, function(err, response, body) {
        if (err) return reject(err);
        if (response.statusCode == 200) return resolve(JSON.parse(body));
        reject(JSON.parse(body));
      })).catch(reject);
    });
  }
   /**
    * 删除单个文件
    * @param {String} key
    * @param {Function} cb
    */
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
   /**
    * 生成下载链接
    * @param {String} key
    * @param {Number} deadTime
    * @param {Number} delay
    * @param {String} downloadName
    */
  makeLink(key, deadTime, delay, downloadName) {
    let self = this;
    if (deadTime && !delay && !downloadName) {
      downloadName = deadTime;
    }
    if (typeof deadTime !== 'number') {
      deadTime = self.conf.TOKEN_EXPIRE;
      delay = self.conf.TOKEN_CACHE_EXPIRE;
    }
    if (typeof delay !== 'number') {
      delay = deadTime - 10;
    }
    return new Promise((resolve, reject) => {
      // 如果启用redis
      if (self.redis) {
        // 检查redis缓存中是否存在
        let REDIS_KEY = `${self.conf.BUCKET}:${key}:${downloadName ? downloadName : ''}`;
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
        let downloadUrl = self.generateLink.call(self, key, deadTime, delay, downloadName);
        resolve(downloadUrl);
      }
    });
  }
   /**
    * generate download link
    * @param {String} key
    * @param {Number} deadTime
    * @param {Number} delay
    * @param {String} downloadName
    */
  generateLink(key, deadTime, delay, downloadName) {
    let self = this,
      SERVER_URL=this.conf.SERVER_URL;

    // 构建私有空间的链接
    let url = key.indexOf('http') == 0 ? key :
      ((key.indexOf('/') === 0)||(SERVER_URL.lastIndexOf('/')===SERVER_URL.length-1)) ? `${SERVER_URL}${encodeURI(key)}` : `${SERVER_URL}/${encodeURI(key)}`;

    // 检测链接失效时间参数和延迟时间
    typeof deadTime == 'number' ?
      typeof delay == 'number' ?
      true :
      (downloadName = delay,
        delay = deadTime - 10) :
      (downloadName = deadTime,
        deadTime = self.conf.TOKEN_EXPIRE,
        delay = self.conf.TOKEN_CACHE_EXPIRE);

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
   /**
    * 批量生成访问链接
    * @param {String} keys
    * @param {Number} deadTime
    */
  batchLinks(keys, deadTime) {
    let self = this;
    let linksArray = [];
    return new Promise((resolve, reject) => {
      keys.forEach((item, index) => {
        self.makeLink.call(self, item, deadTime).then(link => {
          linksArray[index] = link;
          ((linksArray.length == keys.length) && (!linksArray.includes(undefined))) && resolve(linksArray);
        }, err => {
          err && reject(err);
        });
      });
    });
  }
   /**
    * 批量删除文件
    * @param {Array} sourceArray
    * @param {Function} cb
    */
  batchDelete(sourceArray, cb) {
    let self = this;

    return self.batchHandle.call(self, 'delete', sourceArray, cb);
  }
   /**
    * 批量获取元信息
    * @param {Array} sourceArray
    * @param {Function} cb
    */
  batchStat(sourceArray, cb) {
    let self = this;
    return self.batchHandle.call(self, 'stat', sourceArray, cb);
  }
   /**
    * 批量操作
    * @param {String} option
    * @param {Array} sourceArray
    * @param {Function} cb
    */
  batchHandle(option, sourceArray, cb) {
    let self = this;
    // 批量接口path
    let url = 'http://rs.qiniu.com/batch';
    // 对数据进行编码
    let postArray = sourceArray.map(function(item) {
      let entry = item.indexOf(':') > 0 && item || `${self.conf.BUCKET}:${item}`;
      return `op=/${option}/${util.base64ToUrlSafe(new Buffer(entry).toString('base64'))}`;
    });
    // 数据拼接url
    let urlBody = postArray.join('&');

    // 生成管理token凭证
    let accessToken = self._generateAccessToken.call(self, url, urlBody);

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
          resolve(body, res);
        } else {
          reject(err);
        }
      });
    });
  }

  /**
  * 构建管理策略函数
  * @param {String} uri
  * @param {String} body
  */
  _generateAccessToken(uri, body) {
    let self = this;
    var u = URL.parse(uri);
    var path = u.path;
    var access = path + '\n';
    body && (access += body);
    var digest = util.hmacSha1(access, self.conf.SECRET_KEY);
    var safeDigest = util.base64ToUrlSafe(digest);
    return 'QBox ' + self.conf.ACCESS_KEY + ':' + safeDigest;
  }
}


/**
 * 构建上传策略函数，设置回调的url以及需要回调给业务服务器的数据
 * @param {String} key
 * @param {Object} app
 */
var uptoken = function(key, app) {
  var putPolicy = {
    scope: `${app.conf.BUCKET}:${key}`,
    deadline: Math.floor(+new Date) + 3600
  };
  // 对putOolicy进行加密签名
  var encodedPutPolicy = util.base64ToUrlSafe(new Buffer(JSON.stringify(putPolicy)).toString('base64'));
  var sign = util.hmacSha1(encodedPutPolicy, app.conf.SECRET_KEY);
  var encodedSign = util.base64ToUrlSafe(sign);
  var uploadToken = `${app.conf.ACCESS_KEY}:${encodedSign}:${encodedPutPolicy}`;

  // 上传完成的回调地址，默认不启用自定义，交由七牛官方处理上传数据
  // putPolicy.callbackUrl = 'http://domain/qiniucallback';
  // putPolicy.callbackBody = 'filename=$(fname)&filesize=$(fsize)';
  return uploadToken;
};

/**
 * 构造上传函数,通过创建Promise，处理异步上传工作
 * @param {String} uptoken
 * @param {String} key
 * @param {String} localFile
 */
var uploadFile = function(uptoken, key, localFile) {
  var formUploader = new qiniu.form_up.FormUploader();
  return new Promise(function(resolve, reject) {
    var extra = new qiniu.form_up.PutExtra();
    formUploader.putFile(uptoken, key, localFile, extra, function(err, ret) {
      if (!err) {
        resolve(ret);
        // 上传成功， 处理返回值
        // console.log(ret.hash, ret.key, ret.persistentId);
      } else {
        reject(err);
        // 上传失败， 处理返回代码
        // console.log(err);
      }
    });
  });
};

var uploadStreamFile = function(uptoken, key, stream) {
  var formUploader = new qiniu.form_up.FormUploader();
  return new Promise(function(resolve, reject) {
    var extra = new qiniu.form_up.PutExtra();
    formUploader.putStream(uptoken, key, stream, extra, function(err, ret, info) {
      if (err) return reject(err);

      if (info.statusCode === 200) return resolve(ret);

      reject({ info, body: ret });
    });
  });
};
