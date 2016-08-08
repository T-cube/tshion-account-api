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
          content: '您好，如果遇到使用问题，可以先查看菜单栏「帮助手册」自助解决。\n若没有找到答案，或者关于T立方有什么意见和建议，可以通过以下方式联系我们，我们会及时给予答复。\nQQ：502915668\n电话：400 1166 323\n邮箱：cs@tlifang.com\n网址：www.tlifang.com',
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
    return res.reply({
      content: 'T立方 - 云工作平台',
      type: 'text',
    });
  }
}));
