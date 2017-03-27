import C, { ENUMS } from 'lib/constants';
import { buildValidator } from 'lib/inspector';

const schema = {
  register: {
    sanitization: {
      type: { type: 'string' },
      email: { type: 'string', rules: ['trim'] },
      mobile: { type: 'string', rules: ['trim'] },
      password: { type: 'string' },
      code: { type: 'string' },
    },
    validation: {
      type: { $enum: ENUMS.USER_ID_TYPE, code: 'invalid_account_type' },
      email: { $email: true, code: 'invalid_email' },
      mobile: { $mobile: {country: 'cn'}, code: 'invalid_mobile' },
      password: { type: 'string', minLength: 6, maxLength: 20, code: 'bad_password_format' },
      code: { type: 'string', pattern: /\d{6}/, optional: true, code: 'invalid_verify_code' },
    },
  },
  authorise: {
    sanitization: {
      password: { type: 'string' },
    },
    validation: {
      password: { type: 'string', minLength: 6, maxLength: 20 },
    },
  },
};

export const validate = buildValidator(schema);
