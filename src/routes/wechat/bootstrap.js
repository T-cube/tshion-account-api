import express from 'express';
import wechat from 'wechat';
import config from 'config';
import db from 'lib/database';

const api = express.Router();
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
      let openid = message.FromUserName;
      if (message.Event == 'LOCATION') {
        req.model('wechat-util').updateUserLocation(openid, {
          latitude: parseFloat(message.Latitude),
          longitude: parseFloat(message.Longitude),
          precision: parseFloat(message.Precision),
        });
        return res.reply();
      }
      if (message.Event == 'CLICK') {
        if (message.EventKey == 'contact_us') {
          return res.reply({
            content: '您好，如果遇到使用问题，可以先查看菜单栏「帮助手册」自助解决。\n'
              + '若没有找到答案，或者关于T立方有什么意见和建议，可以通过以下方式联系我们，我们会及时给予答复。\n'
              + 'QQ：502915668\n电话：400 1166 323\n邮箱：cs@tlifang.com\n网址：www.tlifang.com',
            type: 'text',
          });
        }
      }
      if (message.Event == 'subscribe') {
        if (message.EventKey && message.Ticket) {
          let key = message.EventKey.replace('qrscene_', '');
          db.qrcode.scan.insert({
            openid,
            key,
            date: new Date(),
          })
          .catch(e => console.error(e));
        }
        return res.reply([
          {
            title: 'T立方云工作平台正式上线 十项全能助力简单工作',
            description: '',
            picurl: 'https://cdn-public.tlifang.com/F7D43C6121FA059D26260C10CA5388F5.jpg',
            url: 'https://www.tlifang.com'
          },
          {
            title: '简单办公，T立方可以如此操作！',
            description: '',
            picurl: 'https://cdn-public.tlifang.com/4349E3273435971F99B6CF0AA05340CF.jpg',
            url: 'https://www.tlifang.com/help'
          },
          {
            title: '注册邀请签到双重红包福利，红包数量由你定！',
            description: '',
            picurl: 'https://cdn-public.tlifang.com/78D1D6514C34DCB603CFBBF432246859.jpg',
            url: 'https://www.tlifang.com/article/post-59dd8955485bdf9c73ecaf6f'
          },
        ]);
      }
      break;
    }
  }
  return res.reply();
}));
