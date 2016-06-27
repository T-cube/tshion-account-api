import _ from 'underscore';

import OAuthModel from './oauth-model.js';
import { findUserByAuthCode } from 'lib/wechat-util.js';

export default _.extend({}, OAuthModel, {
  getAuthCode: function(authCode, callback) {
    findUserByAuthCode(authCode)
    .then(user => {
      if (!user) {
        callback(false, null);
      }
      user.id = user._id;
      callback(false, {
        clientId: 'wechat',
        expires: user.wechat.auth.expired,
        user: user
      });
    })
    .catch(e => callback(e));
  }
});
