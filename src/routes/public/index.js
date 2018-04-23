import _ from 'underscore';
import express from 'express';
import config from 'config';
import { ObjectId } from 'mongodb';
import qs from 'qs';

import db from 'lib/database';
import { time, timestamp, comparePassword, hashPassword, generateToken, getEmailName } from 'lib/utils';
import { ApiError } from 'lib/error';
import { oauthCheck } from 'lib/middleware';
import C from 'lib/constants';
import { sanitizeValidateObject } from 'lib/inspector';

const api = express.Router();
export default api;

api.get('/info', oauthCheck(), (req, res, next) => {
  const user = req.user;
  console.log(user);
  let data = {
    id: user._id,
    email: user.email,
    name: user.name,
  };
  res.sendJson(data);
});

api.get('/user-avatar/:user_id', (req, res, next) => {
  const userId = ObjectId(req.params.user_id);
  db.user.findOne({ _id: userId }, { avatar: 1 })
    .then(user => {
      if (!user) {
        throw new ApiError(404);
      }
      res.redirect(user.avatar);
    })
    .catch(next);
});

api.post('/wechat-jsapi-signture', (req, res, next) => {
  var WechatUtil = req.model('wechat-util');

  WechatUtil.getWechatApi().getJsConfig({
    debug: false,
    jsApiList: [
      'onMenuShareTimeline',
      'onMenuShareAppMessage',
      // 'onMenuShareQQ',
      // 'onMenuShareWeibo',
      // 'onMenuShareQZone',
      // 'startRecord',
      // 'stopRecord',
      // 'onVoiceRecordEnd',
      // 'playVoice',
      'getNetworkType'
    ],
    url: req.body.url
  }, (err, result) => {
    console.log('js api error', err);
    if (err) return next(err);
    res.sendJson(result);
  });
});

if (!(process.env.NODE_ENV === 'production')) {
  api.get('/api-doc/:dir/:doc', (req, res, next) => {
    console.log(req.params);
    const doc = require('fs').readFileSync(__dirname + `/../../../docs/${req.params.dir}/${req.params.doc}.md`);
    res.setHeader('Content-Type', 'text/html');

    const showdown = require('showdown');
    const converter = new showdown.Converter();
    res.send(converter.makeHtml(doc.toString('utf-8')));

    // res.send(require('node-markdown').Markdown(changelogs.toString('utf-8')));
  });


  api.get('/changelogs/:worker', (req, res, next) => {
    const changelogs = require('fs').readFileSync(__dirname + `/../../../changelogs/${req.params.worker}.md`);
    res.setHeader('Content-Type', 'text/html');
    res.send(require('node-markdown').Markdown(changelogs.toString('utf-8')));
  });
}
