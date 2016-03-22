import _ from 'underscore';
import { time } from './utils';
import { ApiError } from './error';

const token_types = ['access_token', 'refresh_token'];

export default {
  // /oauth/revoke interface
  revokeToken(req, res, next) {
    let { token, token_type_hint } = req.body;
    if (!token_type_hint || !_.contains(token_types, token_type_hint)) {
      return next(new ApiError(400, 'invalid token type'));
    }
    if (!token) {
      return next(new ApiError(400, 'missing token'));
    }
    let collection = 'oauth_' + token_type_hint.replace('_','');
    db[collection].findOne({[token_type_hint]: token})
    .then(doc => {
      if (!doc) {
        throw new ApiError(400, 'invalid token');
      } else if (time() > doc.expires) {
        throw new ApiError(400, 'token expired');
      }
      db[collection].remove({[token_type_hint]: token})
      .then(doc => res.json({code: 200}))
    })
    .catch(next);
  }
}