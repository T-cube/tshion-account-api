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

api.post('/', wechat(wechatConfig, function (req, res) {
  let message = req.weixin;
  switch (message.MsgType) {
  case 'event': {
    if (message.Event == 'LOCATION') {
      let openid = message.FromUserName;
      wUtil.updateUserLocation(openid, {
        latitude: parseFloat(message.Latitude),
        longitude: parseFloat(message.Longitude),
        precision: parseFloat(message.Precision),
      });
      return res.reply();
    }
    if (message.Event == 'CLICK') {
      if (message.EventKey == 'contact_us') {
        return res.reply({
          content: '欢迎联系我们：\nQQ: 502915668\nEmail: cs@tlifang.com\nTel: 400 1166 323',
          type: 'text',
        });
      }
    }
    break;
  }
  default:
    if (message.Content == 'oa') {
      return res.reply('http://m.tlifang.com/account/login');
    }
    return res.reply('haha');
  }
}));

// 创建微信菜单
api.get('/set-menu', (req, res, next) => {
  wUtil.createMenu({
    'button': [{
      'type':'view',
      'name':'工作台',
      'url':'http://m.tlifang.com/oa/company'
    }]
  });
  res.json({});
});
