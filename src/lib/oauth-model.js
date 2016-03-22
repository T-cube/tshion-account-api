import bcrypt from 'bcrypt';
import Joi from 'joi';

export default {
  getAccessToken(bearerToken, callback) {
    console.log('in getAccessToken (bearerToken: ' + bearerToken + ')');
    db.oauth_accesstoken.findOne({access_token: bearerToken})
    .then(doc => callback(null, doc)).catch(e => callback(e));
  },

  getClient(clientId, clientSecret, callback) {
    console.log('in getClient (clientId: ' + clientId + ', clientSecret: ' + clientSecret + ')');
    if (clientSecret === null) {
      return db.oauth_clients.findOne({client_id: clientId})
      .then(doc => callback(null, doc)).catch(e => callback(e));
    }
    db.oauth_clients.findOne({client_id: clientId, client_secret: clientSecret})
    .then(doc => callback(null, doc)).catch(e => callback(e));
  },

  grantTypeAllowed(clientId, grantType, callback) {
    console.log('in grantTypeAllowed (clientId: ' + clientId + ', grantType: ' + grantType + ')');
    if (grantType === 'password') {
      return callback(false, true);
    }
    callback(false, true);
  },

  saveAccessToken(token, clientId, expires, user, callback) {
    console.log('in saveAccessToken (token: ' + token + ', clientId: ' + clientId + ', userid: ' + user.id + ', expires: ' + expires + ')');
    let data = {
      access_token: token,
      client_id: clientId,
      user_id: user._id,
      expires: expires
    }
    db.oauth_accesstoken.insert(data).
    then(() => callback(null)).catch(e => callback(e));
  },

  getUser(username, password, callback) {
    console.log('in getUser (username: ' + username + ', password: ' + password + ')');
    let type;
    if (/^1[3|4|5|7|8]\d{9}$/.test(username)) {
      type = "mobile";
    } else if (!Joi.validate(username, Joi.string().email())) {
      type = "email";
    } else {
      return callback(null, null);
    }
    db.user.findOne({[type]: username})
    .then(doc => {
      if (!doc) {
        return callback(null, null);
      }
      let result = bcrypt.compareSync(password, doc.password);
      callback(null, result ? doc : null);
    }).catch(e => callback(e));
  },

  saveRefreshToken(token, clientId, expires, user, callback) {
    console.log('in saveRefreshToken (token: ' + token + ', clientId: ' + clientId +', userId: ' + user. id + ', expires: ' + expires + ')');
    let data = {
      refresh_token: token,
      client_id: clientId,
      user_id: user.id,
      expires: expires
    };
    db.oauth_refreshtoken.insert(data).
    then(() => callback(null)).catch(e => callback(e));
  },

  getRefreshToken(refreshToken, callback) {
    console.log('in getRefreshToken (refreshToken: ' + refreshToken + ')');
    db.oauth_refreshtoken.findOne({refresh_token: refreshToken})
    .then(doc => callback(null, doc))
    .catch(e => callback(e));
  },

  revokeRefreshToken(refreshToken, callback) {
    db.oauth_refreshtoken.remove({refresh_token: refreshToken})
    .then(doc => callback(null, doc))
    .catch(e => callback(e));
  }
}
