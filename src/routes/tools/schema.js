import { ENUMS } from 'lib/constants';
import { buildValidator } from 'lib/inspector';
import NotificationSetting from 'models/notification-setting';

const notificationSetting = new NotificationSetting();
const notificationTypes = notificationSetting.getSettingTypes();
const notificationMethods = notificationSetting.getSettingMethods();

const schema = {
  captcha: {
    sanitization: {
      username: { type: 'string' },
      captchaType: { $enum: ENUMS.CAPTCHA_TYPE },
    },
    validation: {
      username: { type: 'string' },
      captchaType: { $enum: ENUMS.CAPTCHA_TYPE },
    },
  },
  broadcast_id: {
    sanitization: {
      broadcast_id: { $objectId: 1 },
    },
    validation: {
      broadcast_id: { $objectId: 1 },
    },
  }
};

export const validate = buildValidator(schema);
