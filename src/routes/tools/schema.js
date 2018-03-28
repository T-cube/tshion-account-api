import { ENUMS } from 'lib/constants';
import { buildValidator } from 'lib/inspector';


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
