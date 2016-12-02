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
import express from 'express';
import socketio from 'socket.io';
import oauthServer from 'oauth2-server';
import bodyParser from 'body-parser';
import config from 'config';
import _ from 'underscore';
import git from 'git-rev-sync';
import session from 'express-session';
const sessionRedis = require('connect-redis')(session);

import 'lib/i18n';
import bindLoader from 'lib/loader';
import apiRouter from './routes';
import oauthModel from 'lib/oauth-model';
import * as oauthRoute from 'lib/oauth-routes';
import { apiErrorHandler } from 'lib/error';
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
import Redis from '@ym/redis';
import { EmailSender, SmsSender } from 'vendor/sendcloud';
import NotificationSetting from 'models/notification-setting';
import WechatUtil from 'lib/wechat-util';
import UserActivity from 'models/user-activity';
import C from 'lib/constants';

// welcome messages and output corre config
const version = require('../package.json').version;
console.log();
console.log('--------------------------------------------------------------------------------');
console.log('Tlifang API Service v%s', version);
console.log('--------------------------------------------------------------------------------');
console.log(`GIT_REV=${git.short()}`);
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

// bind model loader
bindLoader(app);

// load models
app.loadModel('redis', Redis, config.get('vendor.redis'));
app.loadModel('qiniu', QiniuTools, config.get('vendor.qiniu'));
app.loadModel('ow365', OfficeWeb365, config.get('vendor.officeweb365'));
app.loadModel('email', EmailSender, config.get('vendor.sendcloud.email'));
app.loadModel('sms', SmsSender, config.get('vendor.sendcloud.sms'));
app.loadModel('html-helper', HtmlHelper);
app.loadModel('notification', Notification);
app.loadModel('account', Account);
app.loadModel('document', Document);
app.loadModel('wechat-util', WechatUtil);
app.loadModel('notification-setting', NotificationSetting);

// load services;
app.loadModel('schedule', ScheduleServer);
app.loadModel('socket', SocketServer, io);
app.loadModel('user-activity', UserActivity);

let _loader = {};
app.bindLoader(_loader);
initRPC(config.get('rpc'), _loader).then(cfg => {
  console.log(`rpc connected to ${cfg.protocol}://${cfg.hostname}:${cfg.port}`);
}).catch(console.error);

// model loader
app.use((req, res, next) => {
  app.bindLoader(req);
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
app.all('/oauth/token', app.oauth.grant(), (req, res, next) => {
  req.model('user-activity').createFromReq(req, C.USER_ACTIVITY.LOGIN);
}, (err, req, res, next) => {
  let {body: {grant_type}} = req;
  if (grant_type == 'password') {
    oauthModel._getUser(req.body.username)
    .then(user => {
      req.user = user;
      return req.model('user-activity').createFromReq(req, C.USER_ACTIVITY.LOGIN_FAIL);
    });
  }
  next(err);
});
app.all('/oauth/revoke', oauthRoute.revokeToken);

// use nginx for static resource
// app.use('/', express.static('./public'));

// api routes bind here
app.use('/api', apiRouter);
app.use(app.oauth.errorHandler());

// global error handler
app.use(apiErrorHandler);

// starting server
server.listen(config.get('server'), () => {
  console.log('listening on ', server.address());
  console.log('--------------------------------------------------------------------------------');
});
