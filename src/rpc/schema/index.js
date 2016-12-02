import { ENUMS } from 'lib/constants';
import { buildValidator } from 'lib/inspector';

const schema = {
  qrcode: {
    sanitization: {
      _id: { type: 'int', optional: true },
      name: { type: 'string', minLength: 1, rules: ['trim', 'title'] },
      description: { type: 'string', optional: true },
    },
    validation: {
      _id: { type: 'int', optional: true },
      name: { type: 'string' },
      description: { type: 'string', optional: true },
    }
  }
};

export const validate = buildValidator(schema);
