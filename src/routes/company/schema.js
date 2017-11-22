import { buildValidator } from 'lib/inspector';
import C, { ENUMS } from 'lib/constants';

const schema = {
  company: {
    sanitization: {
      name: { type: 'string', optional: true },
      description: { type: 'string', optional: true },
    },
    validation: {
      name: { type: 'string', optional: true, minLength: 1, maxLength: 100 },
      description: { type: 'string', optional: true, maxLength: 2000 },
    },
  },
  remind: {
    sanitization: {
      close_plan_expired_remind: { type: 'boolean', optional: true },
      close_before_expired_remind: { type: 'boolean', optional: true }
    },
    validation: {
      close_plan_expired_remind: { type: 'boolean', optional: true },
      close_before_expired_remind: { type: 'boolean', optional: true }
    }
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
