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
import Canvas from 'canvas';

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
import Preference from 'models/preference';
import TempFile from 'models/temp-file';
import Payment from 'models/plan/payment';
import C from 'lib/constants';
import { ApiError } from 'lib/error';

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
app.loadModel('preference', Preference);
app.loadModel('temp-file', TempFile);
app.loadModel('payment', Payment);

let _loader = {};
app.bindLoader(_loader);
initRPC(config.get('rpc'), _loader).then(cfg => {
  console.log(`rpc connected to ${cfg.protocol}://${cfg.hostname}:${cfg.port}`);
}).catch(e => {
  console.error('rpc:', e);
});

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
function pwdWrongCreateCapt(wrong, wrongResult, redis, res) {
  captcha.create().then(captchaData => {
    redis.hmset(wrong, {times: parseInt(wrongResult.times)+1, captcha: captchaData.captcha}).then(() => {
      redis.expire(wrong, 60 * 60);
      res.status(400);
      res.set('content-type', 'image/png');
      return captchaData.canvas.pngStream().pipe(res);
    });
  });
}
function wrongPwdCase(req, res) {
  return new Promise((resolve) => {
    let redis = req.model('redis');
    let wrong = `${req.body.username}_pwd_wrong`;
    redis.hmget(wrong).then(wrongResult => {
      if(wrongResult) {
        if(parseInt(wrongResult.times) > 1) {
          pwdWrongCreateCapt(wrong, wrongResult, redis, res);
        }else {
          redis.hmset(wrong, {times: parseInt(wrongResult.times)+1, captcha: ''}).then(() => {
            redis.expire(wrong, 60 * 60);
            resolve();
          });
        }
      }else {
        redis.hmset(wrong, {times: 1, captcha: ''}).then(() => {
          redis.expire(wrong, 60 * 60);
          resolve();
        });
      }
    });
  });
}
function captchaCheck(req, res, next) {
  let wrong = `${req.body.username}_pwd_wrong`;
  let redis = req.model('redis');
  redis.hmget(wrong).then(wrongResult => {
    if(wrongResult) {
      if(parseInt(wrongResult.times) > 2) {
        if(!req.body.captcha) {
          pwdWrongCreateCapt(wrong, wrongResult, redis, res);
        }
        if(req.body.captcha.toLowerCase() == wrongResult.captcha.toLowerCase()) {
          next();
        }else {
          pwdWrongCreateCapt(wrong, wrongResult, redis, res);
        }
      }else {
        next();
      }
    }else {
      next();
    }
  });
}
app.all('/oauth/token', (req, res, next) => {
  captchaCheck(req, res, next);
}, app.oauth.grant(), (req, res, next) => {
  let redis = req.model('redis');
  let wrong = `${req.body.username}_pwd_wrong`;
  redis.delete(wrong);
  req.model('user-activity').createFromReq(req, C.USER_ACTIVITY.LOGIN);
}, (err, req, res, next) => {
  wrongPwdCase(req, res).then(() => {
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
});
app.all('/oauth/revoke', oauthRoute.revokeToken);

app.get('/oauth/captcha', (req, res) => {
  let username = req.query.username;
  let client_id = req.query.client_id;
  let captchaToken = req.query.captchaToken;
  let captchaKey = `${username}_${client_id}_${captchaToken}`;
  let redis = req.model('redis');
  captcha.create().then(captchaData => {
    redis.hmset(captchaKey, {times: 3, captcha: captchaData.captcha}).then(() => {
      redis.expire(captchaKey, 60 * 60);
      res.status(400);
      res.set('content-type', 'image/png');
      return captchaData.canvas.pngStream().pipe(res);
    });
  });
});

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

class Captcha {

  constructor() {
    let self = this;
    self.captchaNumber = 4;
    self.lineNumber = 4;
    self.circleNumber = 4;
  }

  create() {
    let self = this;
    return new Promise((resolve) => {
      let captchaWidth = self.captchaNumber * 30 + 5;
      let canvas = new Canvas(captchaWidth, 60);
      let ctx = canvas.getContext('2d');
      let str = 'ABCDEFGHJKLMNPQRSTUVWXYabcdefhijkmnpqrstuvwxy345678';
      let fontStyle = ['normal', 'oblique'];
      let fontFamily = ['Arial', 'sans-serif'];
      let xaxisStart = 10;
      let captcha = '';
      function colorRandom() {
        return 'rgb(' + Math.floor(Math.random() * 200) + ',' + Math.floor(Math.random() * 200) + ',' + Math.floor(Math.random() * 200) + ')';
      }
      function xaxisRandom() {
        return Math.ceil(Math.random() * captchaWidth);
      }
      function yaxisRandom() {
        return Math.ceil(Math.random() * 60);
      }
      let color = colorRandom();
      for(let i = 0; i < self.captchaNumber; i++) {
        ctx.save();
        let singleCaptcha = str.charAt(Math.floor(Math.random() * str.length));
        let rotateChange = Math.random() * 1-0.5;
        captcha += singleCaptcha;
        ctx.font = fontStyle[Math.floor(Math.random()*2)] + ' ' + Math.ceil(Math.ceil(Math.random()*15)+35)+'px ' + + fontFamily[Math.floor(Math.random()*2)];
        ctx.fillStyle =  color;
        ctx.fillText(singleCaptcha, xaxisStart+Math.ceil(Math.random()*5 - 10), 50+Math.ceil(Math.random()*5 - 10));
        ctx.rotate(rotateChange);
        xaxisStart += 30;
        ctx.restore();
      }
      for(let i = 0; i < self.lineNumber; i++) {
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.lineTo(xaxisRandom(), yaxisRandom());
        ctx.lineTo(xaxisRandom(), yaxisRandom());
        ctx.lineWidth = Math.floor(Math.random()*6);
        ctx.stroke();
      }
      for(let i = 0; i < self.circleNumber; i++) {
        ctx.beginPath();
        ctx.fillStyle =  color;
        ctx.arc(xaxisRandom(), yaxisRandom(), Math.ceil(Math.random()* 2), 0, 2*Math.PI);
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      resolve({captcha, canvas});
    });
  }
}

var captcha = new Captcha();
