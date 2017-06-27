import { buildValidator } from 'lib/inspector';

const schema = {
  appRequest: {
    sanitization: {
      appid: { type: 'string' },
    },
    validation: {
      appid: { type: 'string' },
    },
  },
};

export const validate = buildValidator(schema);
