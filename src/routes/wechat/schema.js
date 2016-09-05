import { ENUMS } from 'lib/constants';
import { buildValidator } from 'lib/inspector';

const schema = {
  scan: {
    sanitization: {
      name: { type: 'string', minLength: 1, rules: ['trim', 'title'] },
      description: { type: 'string', optional: true },
    },
    validation: {
      name: { type: 'string' },
      description: { type: 'string', optional: true },
    }
  }
};

export const validate = buildValidator(schema);
