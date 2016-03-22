import pmongo from 'pmongo';
import Promise from 'bluebird';

import oauthserver from 'oauth2-server';
import bodyParser from 'body-parser';
import http from 'http';
import express from 'express';
import socketio from 'socket.io';

import { database } from './lib/database';
import apiRouter from './routes';
import oauthModel from './lib/oauth-model.js';
import oauthExtended from './lib/oauth-extended.js';
import { apiErrorHandler } from './lib/error';

let app = express();
global.App = app;

let server = http.Server(app);
let io = socketio(server);

global.db = database();
//oauth开始

app.oauth = oauthserver({
  model: oauthModel,
  grants: ['password','refresh_token'],
  debug: false,
  accessTokenLifetime: 1800,
  refreshTokenLifetime: 3600 * 24 * 15,
});

app.use('/oauth',bodyParser.urlencoded({ extended: true }));
app.all('/oauth/token', app.oauth.grant());
app.use('/oauth/revoke', oauthExtended.revokeToken);
//app.use('/api/company', app.oauth.authorise());
app.use('/api/user', app.oauth.authorise());
app.use(app.oauth.errorHandler());

app.use('/', express.static('./public'));

app.use('/api', apiRouter);

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
