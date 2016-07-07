import _ from 'underscore';
import express from 'express';
import wechat from 'wechat';
import config from 'config';

import wUtil from 'lib/wechat-util.js';

let api = express.Router();
export default api;

const wechatConfig = {
  token: config.get('wechat.token'),
  appid: config.get('wechat.appid'),
  encodingAESKey: config.get('wechat.encodingAESKey'),
};

api.use(express.query());

api.use('/', wechat(wechatConfig, function (req, res) {
  let message = req.weixin;
  switch (message.MsgType) {
  case 'event': {
    if (message.Event != 'LOCATION') {
      return;
    }
    let openid = message.FromUserName;
    wUtil.updateUserLocation(openid, _.pick(message, 'Latitude', 'Longitude', 'Precision'));
    return res.reply();
  }
  default:
    console.log(message);
    if (message.Content == 'oa') {
      return res.reply('http://tlf-m.findteachers.cn/account/login');
    }
    return res.reply('haha');
  }
}));
