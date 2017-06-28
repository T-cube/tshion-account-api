import { buildValidator } from 'lib/inspector';
import { ENUMS } from 'lib/constants';

const schema = {
  appRequest: {
    sanitization: {
      appid: { type: 'string', rules: ['trim'] },
    },
    validation: {
      appid: { type: 'string', minLength: 1 },
    },
  },
  list: {
    sanitization: {
      page: { type: 'integer' },
      pagesize: { type: 'integer' },
      appid: { type: 'string', rules: ['trim'] },
    },
    validation: {
      page: { type: 'integer', gte: 1 },
      pagesize: { type: 'integer', gte: 1 },
      appid: { $enum: ENUMS.APP_LIST_TYPE },
    }
  }
};

export const validate = buildValidator(schema);
