import i18n from 'i18n';
import config from 'config';
import path from 'path';

i18n.configure({
  locales: ['en', 'zh-CN'],
  defaultLocale: config.get('locale'),
  directory: path.normalize(__dirname + '/../../locales'),
  updateFiles: false,
  indent: '  ',
  register: global,
});
