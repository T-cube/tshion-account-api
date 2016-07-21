import _ from 'underscore';
import { time } from 'lib/utils';
import qs from 'qs';
import { ObjectId } from 'mongodb';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import oauthModel from 'lib/oauth-model';
import { camelCaseObjectKey } from 'lib/utils';

const token_types = ['access_token', 'refresh_token'];

export function revokeToken(req, res, next) {
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
    .then(() => res.json({code: 200}));
  })
  .catch(next);
}

export function login(req, res, next) {
  if (req.method == 'GET') {
    const { response_type, client_id, redirect_uri } = req.query;
    if (!response_type || !client_id || !redirect_uri) {
      throw new ApiError(400, null, 'missing oauth parameters');
    }
    res.render('oauth/login', {
      error: '',
      response_type,
      client_id,
      redirect_uri,
    });
  } else if (req.method == 'POST') {
    const { username, password, response_type, client_id, redirect_uri } = req.body;
    oauthModel.getUser(username, password, (err, user) => {
      if (err) {
        throw err;
      }
      let data = {
        error: '',
        response_type,
        client_id,
        redirect_uri,
      };
      if (!user) {
        data.error = __('login_failed');
        res.render('oauth/login', data);
      } else {
        req.session.user = user;
        let url = '/oauth/authorise?' + qs.stringify(data);
        res.redirect(302, url);
      }
    });
  } else {
    throw new ApiError(400, null, 'invalid http method');
  }
}

export function authorise(req, res, next) {
  if (req.method == 'GET') {
    res.render('oauth/authorise');
  } else if (req.method == 'POST') {
    res.send('Hello World!');
  }
}

export function authCodeCheck(req, next) {
  let userId = req.session.user && req.session.user._id || null;
  if (userId) {
    db.user.findOne({_id: ObjectId(userId), activiated: true}, {
      name: 1,
      avatar: 1,
      email: 1,
      mobile: 1,
      options: 1,
    })
    .then(user => {
      user.id = user._id;
      next(null, true, user);
    })
    .catch(e => next(e));
  } else {
    next(null, false);
  }
}
