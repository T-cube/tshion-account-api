import C, { ENUMS } from 'lib/constants';
import { buildValidator } from 'lib/inspector';

const schema = {
  register: {
    sanitization: {
      type: { type: 'string' },
      email: { type: 'string' },
      mobile: { type: 'string' },
      password: { type: 'string' },
      code: { type: 'string' },
    },
    validation: {
      type: { $enum: ENUMS.USER_ID_TYPE, code: 'invalid_account_type' },
      email: { $email: true, optional: true, code: 'invalid_email' },
      mobile: { $mobile: {country: 'cn'}, optional: true, code: 'invalid_mobile' },
      password: { type: 'string', minLength: 6, maxLength: 20, code: 'invalid_password' },
      code: { type: 'string', pattern: /\d{6}/, optional: true, code: 'invalid_sms_code' },
    },
  },
};

export const validate = buildValidator(schema);

export const authoriseSanitization = {
  password: { type: 'string' },
};

export const authoriseValidation = {
  password: { type: 'string', minLength: 6, maxLength: 20 },
};
