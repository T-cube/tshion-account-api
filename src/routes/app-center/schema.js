import C, { ENUMS } from 'lib/constants';
import { buildValidator } from 'lib/inspector';

const schema = {
  content: {
    sanitization: {
    },
    validation: {
    },
  },
};

export const validate = buildValidator(schema);
