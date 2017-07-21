import { buildValidator } from 'lib/inspector';
import { ENUMS } from 'lib/constants';

const schema = {
  appRequest: {
    sanitization: {
      appid: { type: 'string', rules: ['trim'] },
      comment_id: { $objectId: 1 },
    },
    validation: {
      appid: { type: 'string', minLength: 1 },
      comment_id: { $objectId: 1 },
    },
  },
  list: {
    sanitization: {
      page: { type: 'integer' },
      pagesize: { type: 'integer' },
      type: { type: 'string', rules: ['trim'] },
    },
    validation: {
      page: { type: 'integer', gte: 1 },
      pagesize: { type: 'integer', gte: 1, lte: 100 },
      type: { $enum: ENUMS.APP_LIST_TYPE },
    },
  },
  comment: {
    sanitization: {
      rate: { type: 'integer' },
      content: { type: 'string', rules: ['trim'] },
    },
    validation: {
      rate: { type: 'integer', gt: 0, lte: 5 },
      content: { type: 'string', maxLength: 1000 },
    },
  }
};

export const validate = buildValidator(schema);
