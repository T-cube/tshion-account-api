import i18n from 'i18n';
import config from 'config';

let __;

i18n.configure({
  locales: ['en', 'zh-CN'],
  directory: __dirname + '/../../locales',
  register: __,
});

let locale = config.get('locale');
i18n.setLocale(locale);

export default __;
