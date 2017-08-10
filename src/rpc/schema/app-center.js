import { buildValidator } from 'lib/inspector';

const schema = {
  stream_data: {
    sanitization: {
      name: { type: 'string', rules: ['trim'] },
      size: { type: 'integer' },
      appid: { type: 'string', rules: ['trim'] },
      type: { type: 'string', rules: ['trim'] },
    },
    validation: {
      name: { type: 'string', minLength: 3 },
      size: { type: 'integer' },
      appid: { type: 'string', minLength: 1 },
      type: { type: 'string', minLength: 1 },
    },
  }
};
export const validate = buildValidator(schema);
