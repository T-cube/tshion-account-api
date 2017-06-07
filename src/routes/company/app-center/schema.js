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
};

export const validate = buildValidator(schema);
