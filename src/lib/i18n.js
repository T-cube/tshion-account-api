import i18n from 'i18n';
import config from 'config';

i18n.configure({
  locales: ['en', 'zh-CN'],
  defaultLocale: config.get('locale'),
  directory: __dirname + '/../../locales',
  updateFiles: false,
  indent: '  ',
  register: global,
});

console.log(getCatalog(), getLocale());
console.log(__('invalid_password'));
