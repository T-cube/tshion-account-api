import _ from 'underscore';
import config from 'config';
import db from 'lib/database';

import OAuthModel from './oauth-model.js';
import wUtil from 'lib/wechat-util.js';

export default _.extend({}, OAuthModel, {

  saveRefreshToken(token, clientId, expires, user, callback) {
    // 使用com_tlifang_mobile的refresh_token登陆
    let data = {
      refresh_token: token,
      client_id: 'com_tlifang_mobile',
      user_id: user.id || user._id,
      expires: expires,
    };
    db.oauth.refreshtoken.insert(data).
    then(() => callback(null)).catch(e => callback(e));
  },

  getAuthCode: function(authCode, callback) {
    wUtil.findUserByAuthCode(authCode)
    .then(user => {
      if (!user) {
        return callback(false, null);
      }
      user.id = user._id;
      callback(false, {
        clientId: config.get('oauth.wechat_client_id'),
        expires: user.wechat.auth.expired,
        user: user
      });
    })
    .catch(e => callback(e));
  }
});
