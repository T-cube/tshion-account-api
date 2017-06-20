// TLifang API Services
// including:
//   * Oauth server
//   * Oauth login pages
//   * OA API server
//   * User content redirecting for third party sites (e.g. avatars)

// fix absolute path
import './bootstrap';

import Promise from 'bluebird';
import http from 'http';
import fs from 'fs';
import express from 'express';
import socketio from 'socket.io';
import oauthServer from 'oauth2-server';
import bodyParser from 'body-parser';
import config from 'config';
import _ from 'underscore';
import git from 'git-rev-sync';
import session from 'express-session';
const sessionRedis = require('connect-redis')(session);
import morgan from 'morgan';

import 'lib/i18n';
import bindLoader from 'lib/loader';
import apiRouter from './routes';
import oauthModel from 'lib/oauth-model';
import * as oauthRoute from 'lib/oauth-routes';
import { apiErrorHandler, apiRouteError } from 'lib/error';
import corsHandler from 'lib/cors';
import SocketServer from 'service/socket';
import ScheduleServer from 'service/schedule';
import { SocketClient } from 'service/socket';
import { initRPC } from 'service/rpc';
import Notification from 'models/notification';
import Account from 'models/account';
import Document from 'models/document';
import HtmlHelper from 'models/html-helper';
import { OfficeWeb365 } from 'vendor/officeweb365';
import { QiniuTools } from 'vendor/qiniu';
import { Weather } from 'vendor/showapi';
import Redis from '@ym/redis';
import { EmailSender, SmsSender } from 'vendor/sendcloud';
import NotificationSetting from 'models/notification-setting';
import Activity from 'models/activity';
import WechatUtil from 'lib/wechat-util';
import UserActivity from 'models/user-activity';
import Preference from 'models/preference';
import TempFile from 'models/temp-file';
import Payment from 'models/plan/payment';
import C from 'lib/constants';
import Security from 'models/security';
import Captcha from 'lib/captcha';
import Broadcast from 'models/broadcast';
import rpc from '@ym/rpc';

// welcome messages and output corre config
const API_VERSION = require('../package.json').version;
console.log();
console.log('--------------------------------------------------------------------------------');
console.log('Tlifang API Service v%s', API_VERSION);
console.log('--------------------------------------------------------------------------------');
console.log(`GIT_SHA1=${git.short()}`);
const NODE_ENV = process.env.NODE_ENV || 'default';
console.log(`NODE_ENV=${NODE_ENV}`);
console.log('loaded config:');
const selectedConfigItems = ['apiUrl', 'webUrl', 'server', 'database'];
console.log(JSON.stringify(_.pick(config, selectedConfigItems), (key, value) => {
  return _.isArray(value) ? value.join(';') : value;
}, 2));
console.log('initializing service...');

const app = express();
const server = http.Server(app);
const io = socketio(server, { path: '/api/socket' });

app.enable('trust proxy');

// let rpc = require('@ym/rpc');

require('./trpc')(rpc);
rpc.install(server, config.get('rpc.trpc'));

// bind model loader
bindLoader(app);

// load models
app.loadModel('redis', Redis, config.get('vendor.redis'));
app.loadModel('qiniu', QiniuTools, config.get('vendor.qiniu'));
app.loadModel('ow365', OfficeWeb365, config.get('vendor.officeweb365'));
app.loadModel('email', EmailSender, config.get('vendor.sendcloud.email'));
app.loadModel('sms', SmsSender, config.get('vendor.sendcloud.sms'));
app.loadModel('weather', Weather, config.get('vendor.showapi.weather'));
app.loadModel('captcha', Captcha, config.get('userVerifyCode.captcha'));
app.loadModel('security', Security, config.get('security'));
app.loadModel('html-helper', HtmlHelper);
app.loadModel('notification', Notification);
app.loadModel('activity', Activity);
app.loadModel('account', Account);
app.loadModel('document', Document);
app.loadModel('wechat-util', WechatUtil);
app.loadModel('notification-setting', NotificationSetting);
app.loadModel('broadcast', Broadcast);

// load services;
app.loadModel('schedule', ScheduleServer);
app.loadModel('socket', SocketServer, io);
app.loadModel('user-activity', UserActivity);
app.loadModel('preference', Preference);
app.loadModel('temp-file', TempFile);
app.loadModel('payment', Payment);

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

if (config.get('debug.httpInfo')) {
  // debug http info
  console.log('debug.httpInfo enabled');
  app.use(morgan(config.get('debug.format'), {
    skip: (req, res) => {
      return req.method == 'OPTIONS';
    }
  }));
}
if (config.get('debug.apiError')) {
  // debug http info
  console.log('debug.apiError enabled');
}

app.use((req, res, next) => {
  // model loader
  app.bindLoader(req);
  // set application headers
  res.set({
    'X-Powered-By': `tlf-api/${API_VERSION}`,
    'X-Content-Type-Options': 'nosniff',
    'Vary': 'Accept-Encoding',
  });
  next();
});

// Oauth 2.0 Authorization
app.set('view engine', 'ejs');
app.oauth = oauthServer({
  model: oauthModel,
  grants: ['password', 'refresh_token', 'authorization_code'],
  debug: false,
  accessTokenLifetime: 1800,
  refreshTokenLifetime: 3600 * 24 * 15,
  continueAfterResponse: true,
});

app.use('/oauth', corsHandler);

app.use('/oauth', session({
  store: new sessionRedis(config.get('vendor.sessionRedis')),
  // cookie: { path: '/oauth', httpOnly: true, secure: false, maxAge: null },
  // name: 'tlf.sid',
  secret: 'the quick blue fish jumps over the lazy cat',
  resave: false,
  saveUninitialized: false,
}));

// use form to submit Oauth params
app.use('/oauth', bodyParser.urlencoded({ extended: true }));
// auth code grant type (for third party sites)
app.use('/oauth/login', oauthRoute.login);
app.get('/oauth/authorise', app.oauth.authCodeGrant(oauthRoute.authCodeCheck));
// grant token
app.post('/oauth/token',
  oauthRoute.ipCheck(),
  oauthRoute.userCheck(),
  app.oauth.grant(),
  oauthRoute.tokenSuccess(),
  oauthRoute.captchaErrorResolve(),
  oauthRoute.logError()
);
app.all('/oauth/revoke', oauthRoute.revokeToken);


// use nginx for static resource
// app.use('/', express.static('./public'));

// api routes bind here
app.use('/api', apiRouter);
app.use(app.oauth.errorHandler());

// global error handler
app.use(apiRouteError);
app.use(apiErrorHandler);

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
