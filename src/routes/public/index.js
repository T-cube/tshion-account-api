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
  res.json(data);
});

api.get('/user-avatar/:user_id', (req, res, next) => {
  const userId = ObjectId(req.params.user_id);
  db.user.findOne({ _id: userId }, { avatar: 1 })
    .then(user => {
      if (!user) {
        throw new ApiError(404);
      }
      res.redirect(user.avatar + req._parsedUrl.search);
    })
    .catch(next);
});

api.post('/wechat-jsapi-signture', (req, res, next) => {
  var WechatUtil = req.model('wechat-util');
  const wechatApi = WechatUtil.wechatApi;
  const appId = wechatApi.appid;
  console.log(appId)


  var noncestr = new Buffer((+new Date).toString()).toString('base64');
  var timestamp = ~~((+new Date) / 1000);
  console.log(req.body)
  var signValue = {
    jsapi_ticket: WechatUtil.jsapi_ticket.ticket,
    ...req.body,
    noncestr,
    timestamp
  };


  var signature = Object.keys(signValue).sort().map(key => `${key}=${signValue[key]}`).join('&');
  console.log(signature)
  signature = require('crypto').createHash('sha1').update(signature).digest('hex');

  var jsApiList = [
    'onMenuShareTimeline',
    'onMenuShareAppMessage',
    'onMenuShareQQ',
    'onMenuShareWeibo',
    'onMenuShareQZone',
    'startRecord',
    'stopRecord',
    'onVoiceRecordEnd',
    'playVoice'
  ];
  res.json({ appId, nonceStr: noncestr, timestamp, debug: true, jsApiList, signature });

  // debug: true, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
  //   appId: 'wx7961afad7b487af1', // 必填，公众号的唯一标识
  //   timestamp: , // 必填，生成签名的时间戳
  //   nonceStr: '', // 必填，生成签名的随机串
  //   signature: '',// 必填，签名，见附录1
  //   jsApiList: [] // 必填，需要使用的JS接口列表，所有JS接口列表见附录2
});

if (!(process.env.NODE_ENV === 'production')) {
  api.get('/changelogs/:worker', (req, res, next) => {
    const changelogs = require('fs').readFileSync(__dirname + `/../../../changelogs/${req.params.worker}.md`);
    res.setHeader('Content-Type', 'text/html');
    res.send(require('node-markdown').Markdown(changelogs.toString('utf-8')));
  });
}
