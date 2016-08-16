import Qiniu from './qiniu';
import _ from 'underscore';

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

  getInstance(bucket, https = true) {
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
      };
      if (!instances[bucket]) {
        instances[bucket] = {};
      }
      instances[bucket][protocol] = new Qiniu(options);
    }
    return instances[bucket][protocol];
  }

}
