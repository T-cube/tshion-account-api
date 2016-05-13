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

import bindLoader from 'lib/loader';
import { database } from 'lib/database';
import apiRouter from './routes';
import oauthModel from 'lib/oauth-model.js';
import oauthExtended from 'lib/oauth-extended.js';
import { apiErrorHandler } from 'lib/error';
import corsHandler from 'lib/cors';
import 'lib/i18n';

console.log('Tlifang API service');
console.log('--------------------------------------------------------------------------------');
console.log('loaded config:');
console.log(JSON.stringify(config, null, 2));
console.log('initializing service...');

let app = express();

let server = http.Server(app);
let io = socketio(server);

// bind model loader
bindLoader(app);

app.use((req, res, next) => {
  app.bindLoader(req);
  next();
});

global.db = database();
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

io.on('connection', function(socket){
  console.log('a user connected');
  socket.on('chat message', function(msg){
    console.log('message: ' + msg);
    io.emit('chat message', msg);
  });
});

server.listen(3000, function(){
  console.log('listening on *:3000');
});
