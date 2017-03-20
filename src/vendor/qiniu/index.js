import _ from 'underscore';

import Qiniu from './qiniu';
import QiniuImage from './qiniu-image';

export class QiniuTools {

  constructor(options) {
    this.conf = options;
    this.instances = {};
  }

  getBucketConfig(bucket, https = true) {
    const conf = this.conf;
    if (!_.has(conf.buckets, bucket)) {
      throw new Error(`qiniu: unknown bucket "${bucket}"`);
    }
    const config = conf.buckets[bucket];
    if (https && !config.https) {
      https = false;
      //throw new Error(`qiniu: bucket "${bucket} does not support https"`);
    }
    let domain = config.domain;
    let baseUrl = `http${https ? 's' : ''}://${domain}/`;
    return _.extend({}, config, {baseUrl});
  }

  image(url) {
    return new QiniuImage(url);
  }

  parse(url) {
    const pattern = /^https?:\/\/(cdn-[\w\-]+)\.tlifang\.com\/(.+?)(\?.+)$/;
    const result = pattern.exec(url);
    if (result) {
      const [, cdn_bucket, cdn_key, processor] = result;
      return {cdn_bucket, cdn_key, processor};
    } else {
      return null;
    }
  }

  bucket(bucket, https = true) {
    const conf = this.conf;
    const instances = this.instances;
    let protocol = https ? 'https' : 'http';
    if (!(instances[bucket] && instances[bucket][protocol])) {
      let bucketConfig = this.getBucketConfig(bucket, https);
      let options = {
        ACCESS_KEY: conf.ACCESS_KEY,
        SECRET_KEY: conf.SECRET_KEY,
        BUCKET: bucketConfig.name,
        SERVER_URL: bucketConfig.baseUrl,
        TOKEN_EXPIRE: conf.TOKEN_EXPIRE,
        TOKEN_CACHE_EXPIRE: conf.TOKEN_CACHE_EXPIRE,
        isPrivate: bucketConfig.private,
        redis: this.model('redis'),
      };
      if (!instances[bucket]) {
        instances[bucket] = {};
      }
      instances[bucket][protocol] = new Qiniu(options);
    }
    return instances[bucket][protocol];
  }

}
