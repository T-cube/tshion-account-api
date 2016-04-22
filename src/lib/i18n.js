import i18n from 'i18n';
import config from 'config';

i18n.configure({
  locales: ['en', 'zh-CN'],
  directory: __dirname + '/../../locales',
  register: global,
});

let locale = config.get('locale');
i18n.setLocale(locale);
