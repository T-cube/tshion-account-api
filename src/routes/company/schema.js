import { buildValidator } from 'lib/inspector';
import C, { ENUMS } from 'lib/constants';

const schema = {
  company: {
    sanitization: {
      name: { type: 'string' },
      description: { type: 'string' },
    },
    validation: {
      name: { type: 'string', minLength: 1, maxLength: 100 },
      description: { type: 'string', maxLength: 2000 },
    },
  },
};

export const validate = buildValidator(schema);
