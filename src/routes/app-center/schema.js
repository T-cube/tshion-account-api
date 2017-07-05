import { buildValidator } from 'lib/inspector';
import { ENUMS } from 'lib/constants';

const schema = {
  appRequest: {
    sanitization: {
      appid: { type: 'string', rules: ['trim'] },
      comment_id: { $objectId: 1 },
      comment: {
        type: 'object',
        properties: {
          app_version: { type: 'string' },
          star: { type: 'number' },
          content: { type: 'string' },
        }
      },
    },
    validation: {
      appid: { type: 'string', minLength: 1 },
      comment_id: { $objectId: 1 },
      comment: {
        type: 'object',
        properties: {
          app_version: { type: 'string' },
          star: { type: 'number' },
          content: { type: 'string' },
        }
      },
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
    }
  }
};

export const validate = buildValidator(schema);
