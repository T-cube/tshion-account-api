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
import { SocketClient } from 'service/socket';
import ScheduleServer from 'service/schedule';
import Notification from 'models/notification';
import Account from 'models/account';
import Document from 'models/document';
import WechatAccess from 'models/wechat-access';
import HtmlHelper from 'models/html-helper';
import { OfficeWeb365 } from 'vendor/officeweb365';
import { QiniuTools } from 'vendor/qiniu';
import Redis from '@ym/redis';
import { EmailSender, SmsSender } from 'vendor/sendcloud';

// welcome messages and output corre config
const version = require('../package.json').version;
console.log();
console.log('--------------------------------------------------------------------------------');
console.log('Tlifang API Service v%s', version);
console.log('--------------------------------------------------------------------------------');
console.log('NODE_ENV=' + process.env.NODE_ENV);
console.log('loaded config:');
console.log(JSON.stringify(_.pick(config, ['apiUrl', 'webUrl', 'server', 'database']), (key, value) => {
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
app.loadModel('wechat-access', WechatAccess, app.model('redis'));

// load services;
app.loadModel('schedule', ScheduleServer);
app.loadModel('socket', SocketServer, io);

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
app.all('/oauth/token', app.oauth.grant());
app.use('/oauth/revoke', oauthRoute.revokeToken);

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
