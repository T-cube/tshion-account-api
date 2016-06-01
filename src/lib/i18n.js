import i18n from 'i18n';
import config from 'config';

i18n.configure({
  locales: ['en', 'zh-CN'],
  directory: __dirname + '/../../locales',
});

let locale = config.get('locale');
i18n.setLocale(locale);

export default i18n;
