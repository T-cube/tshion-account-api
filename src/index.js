// fix absolute path
import './bootstrap';

import pmongo from 'pmongo';
import Promise from 'bluebird';
import http from 'http';
import express from 'express';
import socketio from 'socket.io';
import oauthserver from 'oauth2-server';
import bodyParser from 'body-parser';
import config from 'config';
import _ from 'underscore';

import 'lib/i18n';
import bindLoader from 'lib/loader';
import { database } from 'lib/database';
import apiRouter from './routes';
import oauthModel from 'lib/oauth-model.js';
import oauthExtended from 'lib/oauth-extended.js';
import { apiErrorHandler } from 'lib/error';
import corsHandler from 'lib/cors';
import initSocketServer from 'service/socket';
import scheduleServer from 'service/schedule';
import Notification from 'models/notification';

console.log('Tlifang API service');
console.log('--------------------------------------------------------------------------------');
console.log('enviroment:', process.env.NODE_ENV);
console.log('loaded config:');
console.log(JSON.stringify(config, (key, value) => {
  return _.isArray(value) ? value.join(';') : value;
}, 2));
console.log('initializing service...');

const app = express();
const server = http.Server(app);
const io = socketio(server, { path: '/api/socket' });
const socketServer = initSocketServer(io);

// bind model loader
bindLoader(app);
app.bindModel('socket', socketServer);
app.loadModel('notification', Notification);

app.use((req, res, next) => {
  app.bindLoader(req);
  next();
});

global.db = database();

app.loadModel('schedule', scheduleServer);
app.model('schedule').doJobs();
//oauth开始

app.oauth = oauthserver({
  model: oauthModel,
  grants: ['password','refresh_token'],
  debug: false,
  accessTokenLifetime: 1800,
  refreshTokenLifetime: 3600 * 24 * 15,
});

app.use('/oauth', corsHandler);
app.use('/oauth', bodyParser.urlencoded({ extended: true }));
app.all('/oauth/token', app.oauth.grant());
app.use('/oauth/revoke', oauthExtended.revokeToken);
// app.use('/api', app.oauth.authorise());

// app.use('/', express.static('./public'));

app.use('/api', apiRouter);
app.use(app.oauth.errorHandler());

// global error handler
app.use(apiErrorHandler);

server.listen(config.get('server'), () => {
  console.log('listening on ', server.address());
});
