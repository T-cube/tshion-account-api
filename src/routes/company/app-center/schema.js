import { buildValidator } from 'lib/inspector';

const schema = {
  appRequest: {
    sanitization: {
      app_id: { $objectId: 1 },
      comment_id: { $objectId: 1 },
      flag: { type: 'boolean' },
      options: {
        type: 'object'
      },
      comment: {
        app_version: { type: 'string' },
        star: { type: 'number' },
        content: { type: 'string' },
      },
    },
    validation: {
      app_id: { $objectId: 1 },
      comment_id: { $objectId: 1 },
      flag: { type: 'boolean' },
      options: {
        type: 'object'
      },
      comment: {
        app_version: { type: 'string' },
        star: { type: 'number' },
        content: { type: 'string' },
      },
    },
  },
  test: {
    sanitization: {
      page: { type: 'integer' },
      type: { type: 'string' },
      pagesize: { type: 'integer', def: 10, optional:false }
    },
    validation: {
      page: { type:'integer', gte: 1 },
      type: { $enum: ['inbox', 'outbox'], code: 'invalid_box_check' },
      pagesize: { type:'integer', gte: 1 }
    }
  }
};

export const validate = buildValidator(schema);
