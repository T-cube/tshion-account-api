import redis from 'redis';

export default class Redis {
  constructor(options) {
    let self = this;

    // 初始化redisClient对象
    (typeof options == 'object') || (options = {});
    options.port || (options.port = 6379);
    options.host || (options.host = '127.0.0.1');
    self.client = redis.createClient(options);

    // 如果redis被增加了授权机制，那么需要进行auth认证操作
    options.auth && self.client.auth(options.auth.password, options.auth.cb);

    // 抛出异常
    self.client.on('connect', () => {
      console.log('redis server connected!');
      self.hmset('test', {a:1}).then((data) => {
        console.log('value saved', data);
      });
    });
    self.client.on('error', function(err) {
      throw err;
    });
  }

  // 为存储内容设置过期时间
  expire(key, delay) {
    let self = this;
    self.client.expire.call(self.client, key, delay);
  }

  // 键值对集合存储，存储的是一个集合，而不是每个单独的key-value
  // 可用于存储json数据
  hmset(hash, valueObject, expire, cb) {
    let self = this;
    typeof expire == 'function' && (cb = expire, expire = null);
    if (!(typeof valueObject == 'object')) {
      let tempString = valueObject;
      valueObject = {};
      valueObject[hash] = tempString;
    }
    return new Promise((resolve, reject) => {
      self.client.hmset.call(self.client, hash, valueObject, (err, res) => {
        typeof cb == 'function' && cb(err, res);
        if (!err) {
          expire && self.client.expire(hash, expire);
          resolve(res);
        } else {
          reject(err);
        }
      });
    });
  }

  // 键值对集合提取
  hmget(hash, cb) {
    let self = this;
    return new Promise((resolve, reject) => {
      self.client.hgetall.call(self.client, hash, (err, obj) => {
        typeof cb == 'function' && cb(err, obj);
        err && reject(err);
        obj && resolve(obj);
      });
    });
  }

  // 键值对存储，value是一个string或buffer
  set(key, value, cb) {
    let self = this;
    return new Promise((resolve, reject) => {
      self.client.set.call(self.client, key, value, (err, obj) => {
        typeof cb == 'function' && cb(err, obj);
        err && reject(err) || resolve(obj);
      });
    });
  }

  get(key, cb) {
    let self = this;
    return new Promise((resolve, reject) => {
      self.client.get.call(self.client, key, (err, obj) => {
        typeof cb == 'function' && cb(err, obj);
        obj && resolve(obj) || reject(err || 'REDIS_KEY is missing');
      });
    });
  }

  delete(key, cb) {
    let self = this;
    return new Promise((resolve, reject) => {
      self.client.del.call(self.client, key, (err, obj) => {
        typeof cb == 'function' && cb(err, obj);
        err && reject(err) || resolve(key);
      });
    });
  }
}
