import _ from 'underscore';
import { time } from './utils';
import { ApiError } from './error';

const token_types = ['access_token', 'refresh_token'];

export default {
  // /oauth/revoke interface
  revokeToken(req, res, next) {
    let { token, token_type_hint } = req.body;
    if (!token_type_hint || !_.contains(token_types, token_type_hint)) {
      return next(new ApiError(400, 'invalid_request',
        'The token type provided is invalid.'));
    }
    if (!token) {
      return next(new ApiError(401, 'invalid_token',
        'The access token provided is invalid.'));
    }
    let collection = token_type_hint.replace('_','');
    db.oauth[collection].findOne({[token_type_hint]: token})
    .then(doc => {
      if (!doc) {
        throw new ApiError(400, 'invalid token');
      } else if (time() > doc.expires) {
        throw new ApiError(400, 'token expired');
      }
      db.oauth[collection].remove({[token_type_hint]: token})
      .then(doc => res.json({code: 200}))
    })
    .catch(next);
  }
}
