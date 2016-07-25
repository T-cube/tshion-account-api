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
    wUtil.updateUserLocation(openid, {
      latitude: parseFloat(message.Latitude),
      longitude: parseFloat(message.Longitude),
      precision: parseFloat(message.Precision),
    });
    return res.reply();
  }
  default:
    if (message.Content == 'oa') {
      return res.reply('http://m.tlifang.com/account/login');
    }
    return res.reply('haha');
  }
}));

// 创建微信菜单
api.use('/set-menu', (req, res, next) => {
  wUtil.createMenu({
    'button': [{
      'type':'view',
      'name':'工作台',
      'url':'http://m.tlifang.com/oa/company'
    }]
  });
  res.json({});
});
