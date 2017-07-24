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
  user_file: {
    sanitization: {
      sort_type: { type: 'string' },
      key_word: { type: 'string', rules: ['trim'], optional: true },
      last_id: { $objectId: 1 , optional: true },
    },
    validation: {
      sort_type: { $enum: ENUMS.FILE_SORT_TYPE },
      key_word: { type: 'string', optional: true },
      last_id: { $objectId: 1 , optional: true },
    },
  }
};

export const validate = buildValidator(schema);
