import _ from 'underscore';

import OAuthModel from './oauth-model.js';
import { getUserByAuthCode } from 'lib/wechat-util.js';

export default _.extend({}, OAuthModel, {
  getAuthCode: function(authCode, callback) {
    getUserByAuthCode(authCode)
    .then(user => {
      if (!user) {
        callback(false);
      }
      callback(false, {
        clientId: 'wechat',
        expires: user.wechat.auth.expired,
        user: user
      });
    })
    .catch(() => callback(false));
  }
});
