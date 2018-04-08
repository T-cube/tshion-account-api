import config from 'config';
const redis = require('@ym/redis').promiseRedis(config.get('vendor.redis'));


const PREFIX = {
  USER_INFO: 'user.info_',
  ACCESS_TOKEN: 'oauth.access_',
  USER_ACCESS: 'user.access_'
};

/**
 * set userinfo to redis cache
 * @param {{}} userinfo
 * @returns {Promise}
 */
export function setUserInfoCache(userinfo) {
  let user_key = `${PREFIX.USER_INFO}${userinfo._id.toHexString()}`;

  return redis.hmset(user_key, userinfo);
}

/**
 * update userinfo in redis cache
 * @param {{}} info
 * @returns {Promise}
 */
export function updateUserInfoCache(info) {
  let user_key = `${PREFIX.USER_INFO}${info._id.toHexString()}`;

  return redis.hmset(user_key, info);
}

export function getUserInfoCache(user_id) {
  let user_key = `${PREFIX.USER_INFO}${(typeof user_id =='string')? user_id:user_id.toHexString}`;

  return redis.hmget(user_key);
}

/**
 * set access token to redis cache
 * @param {{}} token
 */
export function setAccessTokenCache(token) {
  let key = `${PREFIX.ACCESS_TOKEN}${token.access_token}`;

  return redis.hmset(key, token);
}

/**
 * get access token info from redis cache
 * @param {String} access_token
 * @returns {Promise}
 */
export function getAccessTokenCache(access_token) {
  let key = `${PREFIX.ACCESS_TOKEN}${access_token}`;

  return redis.hmget(key);
}

/**
 * set user and access token relation ship
 * @param {{}} user
 * @param {{}} token
 * @returns {Promise}
 */
export function setUserAccessTokenRelation(user, token) {
  let user_token = `${PREFIX.USER_ACCESS}${user._id.toHexString()}`;
  let key = `${PREFIX.ACCESS_TOKEN}${token.access_token}`;

  return redis.get(user_token).then(preKey => {
    return Promise.all([
      redis.del(preKey ? preKey : ''),
      redis.set(user_token, key),
      setAccessTokenCache(token),
      setUserInfoCache(user)
    ]);
  });
}
