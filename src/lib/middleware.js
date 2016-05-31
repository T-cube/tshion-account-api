import db from 'lib/database';
import { ApiError } from 'lib/error';
import { time } from 'lib/utils';

export function oauthCheck(options) {
  return (req, res, next) => {
    req.app.oauth.authorise()(req, res, next);
  }
}

export function authCheck() {
  return (req, res, next) => {
    let token = req.body.auth_check_token;
    console.log(token);
    if (!token || !/^\w+$/.test(token)) {
      throw new ApiError(401, 'invalid_request', 'bad or missing authorise token');
    }
    let query = {
      user_id: req.user._id,
      token: token,
    };
    db.auth_check_token.findOne(query)
    .then(doc => {
      if (!doc) {
        throw new ApiError(401, 'invalid_request', 'invalid authorise token');
      }
      db.auth_check_token.remove(query);
      if (time() > doc.expires) {
        throw new ApiError(401, 'invalid_request', 'authorise token expired');
      }
    })
    .then(() => next())
    .catch(() => next('route'));
  }
}
