import { ENUMS } from 'lib/constants';
import { buildValidator } from 'lib/inspector';
import NotificationSetting from 'models/notification-setting';

const notificationSetting = new NotificationSetting();
const notificationTypes = notificationSetting.getSettingTypes();
const notificationMethods = notificationSetting.getSettingMethods();

const schema = {
  params: {
    sanitization: {
      username: { type: 'string' },
      grant_type: { type: 'string' },
      client_id: { type: 'string' },
      client_secret: { type: 'string' },
      password: { type: 'string' },
      captcha: { type: 'string' , rules: ['trim', 'lower'] , optional: true },
    },
    validation: {
      username: { type: 'string' },
      grant_type: { type: 'string' },
      client_id: { type: 'string' },
      client_secret: { type: 'string' },
      password: { type: 'string' },
      captcha: { type: 'string' , optional: true },
    },
  },
};

export const validate = buildValidator(schema);
