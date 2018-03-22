import { ENUMS } from 'lib/constants';
import { buildValidator } from 'lib/inspector';

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
