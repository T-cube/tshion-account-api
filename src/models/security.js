import { ApiError } from 'lib/error';

export default class Security {

  constructor(config) {
    this.config = config;
  }

  init() {

  }

  limitRequestFrequency(type, id, time) {
    const redis = this.model('redis');
    let key = `frequency_${type}_${id}`;
    return redis.exists(key)
      .then(exist => {
        if (exist) {
          throw new ApiError(429, 'too_many_requests');
        }
        return redis.setex(key, time, id);
      });
  }
}
