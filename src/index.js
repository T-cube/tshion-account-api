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

import 'lib/i18n';
import bindLoader from 'lib/loader';
import apiRouter from './routes';
import oauthModel from 'lib/oauth-model.js';
import oauthExtended from 'lib/oauth-extended.js';
import { apiErrorHandler } from 'lib/error';
import corsHandler from 'lib/cors';
import SocketServer from 'service/socket';
import { SocketClient } from 'service/socket';
import ScheduleServer from 'service/schedule';
import Notification from 'models/notification';
import Account from 'models/account';
import Document from 'models/document';
import { EmailSender, SmsSender } from 'vendor/sendcloud';
import wechatOAuthRoute from './routes/wechat-oauth';

console.log('--------------------------------------------------------------------------------');
console.log('Tlifang API Service');
console.log('--------------------------------------------------------------------------------');
console.log('NODE_ENV:', process.env.NODE_ENV);
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
app.loadModel('email', EmailSender, config.get('vendor.sendcloud.email'));
app.loadModel('sms', SmsSender, config.get('vendor.sendcloud.sms'));
app.loadModel('notification', Notification);
app.loadModel('account', Account);
app.loadModel('document', Document);

// load services;
app.loadModel('schedule', ScheduleServer);
app.loadModel('socket', SocketServer, io);

app.use((req, res, next) => {
  app.bindLoader(req);
  next();
});

//oauth开始
app.oauth = oauthServer({
  model: oauthModel,
  grants: ['password','refresh_token','authorization_code'],
  debug: false,
  accessTokenLifetime: 1800,
  refreshTokenLifetime: 3600 * 24 * 15,
});

app.use('/oauth', corsHandler);
app.use('/oauth', bodyParser.urlencoded({ extended: true }));
app.post('/oauth/authorise', app.oauth.authCodeGrant(function (req, next) {
  next(null);
}));
app.get('/oauth/authorise', app.oauth.authCodeGrant(function (req, next) {
  next(null);
}));
app.all('/oauth/token', (req, res, next) => {
  app.oauth.grant()(req, res, next);
});
app.use('/oauth/revoke', oauthExtended.revokeToken);
// app.use('/api', app.oauth.authorise());

app.use('/wechat-oauth', wechatOAuthRoute);
app.use('/api/wechat-oauth', wechatOAuthRoute);

// app.use('/', express.static('./public'));

app.use('/api', apiRouter);
app.use(app.oauth.errorHandler());

// global error handler
app.use(apiErrorHandler);

server.listen(config.get('server'), () => {
  console.log('listening on ', server.address());
});
