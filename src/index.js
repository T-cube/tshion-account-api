// TLifang API Services including:
//   * Oauth server
//   * Oauth login pages
//   * OA API server
//   * User content redirecting for third party sites (e.g. avatars) fix
// absolute path
import './bootstrap';

import Promise from 'bluebird';
import http from 'http';
import express from 'express';
import oauthServer from 'oauth2-server';
import bodyParser from 'body-parser';
import config from 'config';
import _ from 'underscore';

import Redis from 'ym-redis';

import session from 'express-session';
const sessionRedis = require('connect-redis')(session);

import bindLoader from 'lib/loader';
import apiRouter from './routes';
import oauthModel from 'lib/oauth-model';

import * as oauthRoute from 'lib/oauth-routes';
import {apiErrorHandler, apiRouteError} from 'lib/error';
import corsHandler from 'lib/cors';
import {initRPC} from 'service/rpc';
import Account from 'models/account';
import {QiniuTools} from 'vendor/qiniu';
import {EmailSender, SmsSender} from 'vendor/sendcloud';
import YunPian from 'vendor/yunpian';
import Security from 'models/security';
import Captcha from 'lib/captcha';
import rpc from 'ym-rpc';

import sendJson from 'lib/send-json';

// welcome messages and output corre config
const API_VERSION = require('../package.json').version;
console.log();
console.log('--------------------------------------------------------------------------------');
console.log('Tlifang API Service v%s', API_VERSION);
console.log('--------------------------------------------------------------------------------');
const NODE_ENV = process.env.NODE_ENV || 'default';
console.log(`NODE_ENV=${NODE_ENV}`);
console.log('loaded config:');
console.log('initializing service...');

const app = express();
const server = http.Server(app);

app.enable('trust proxy');

require('./trpc')(rpc);
rpc.install(server, config.get('rpc.trpc'));

// bind model loader
bindLoader(app);

// load models app.loadModel('redis', Redis, config.get('vendor.redis'));

const redis = require('ym-redis').promiseRedis(config.get('vendor.redis'));
app.bindModel('redis', redis);
app.loadModel('qiniu', QiniuTools, config.get('vendor.qiniu'));
app.loadModel('email', EmailSender, config.get('vendor.sendcloud.email'));
app.loadModel('sms', SmsSender, config.get('vendor.sendcloud.sms'));
app.loadModel('yunpian', YunPian, config.get('vendor.yunpian'));
app.loadModel('captcha', Captcha, config.get('userVerifyCode.captcha'));
app.loadModel('security', Security, config.get('security'));
app.loadModel('account', Account);

let _loader = {};
app.bindLoader(_loader);
initRPC(config.get('rpc'), _loader).then(rpc => {
  let cfg = rpc.rpcConfig;
  let ClientRpc = rpc.clientRpc;
  app.bindModel('clientRpc', ClientRpc);
  console.log(`rpc connected to ${cfg.protocol}://${cfg.hostname}:${cfg.port}`);
}).catch(e => {
  console.error('rpc:', e);
});

if (config.get('debug.apiError')) {
  // debug http info
  console.log('debug.apiError enabled');
}

app.use((req, res, next) => {
  // model loader
  app.bindLoader(req);

  // set application headers
  res.set({'X-Powered-By': `tlf-api/${API_VERSION}`, 'X-Content-Type-Options': 'nosniff', 'Vary': 'Accept-Encoding'});
  console.log(req.url);
  next();
});

// Oauth 2.0 Authorization
app.set('view engine', 'ejs');
app.oauth = oauthServer({
  model: oauthModel,
  grants: [
    'password', 'refresh_token', 'authorization_code'
  ],
  debug: false,
  accessTokenLifetime: 3600 * 24 *15,
  refreshTokenLifetime: 3600 * 24 * 15,
  continueAfterResponse: true
});

app.use('/oauth', corsHandler);

app.use('/oauth', session({
  store: new sessionRedis(config.get('vendor.sessionRedis')),
  // cookie: { path: '/oauth', httpOnly: true, secure: false, maxAge: null },
  // name: 'tlf.sid',
  secret: 'the quick blue fish jumps over the lazy cat',
  resave: false,
  saveUninitialized: false
}));
app.use(bodyParser.urlencoded({extended: true}));
app.use(sendJson);
// use form to submit Oauth params
app.use('/oauth', bodyParser.urlencoded({extended: true}));
// auth code grant type (for third party sites)
app.use('/oauth/login', oauthRoute.login);
app.get('/oauth/authorise', app.oauth.authCodeGrant(oauthRoute.authCodeCheck));
// grant token
app.post('/oauth/token',
// oauthRoute.ipCheck(), oauthRoute.userCheck(),
app.oauth.grant(), oauthRoute.tokenSuccess(),
// oauthRoute.captchaErrorResolve(),
oauthRoute.logError());
app.all('/oauth/revoke', oauthRoute.revokeToken);

// use nginx for static resource app.use('/', express.static('./public')); api
// routes bind here
app.use('/api', apiRouter);
app.use(app.oauth.errorHandler());

// global error handler
app.use(apiErrorHandler);
app.use(apiRouteError);

export default app;

// starting server
server.listen(config.get('server'), err => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log('listening on ', server.address());
  console.log('--------------------------------------------------------------------------------');
});
