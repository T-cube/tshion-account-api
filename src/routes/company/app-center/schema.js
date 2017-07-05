import { buildValidator } from 'lib/inspector';

const schema = {
  appRequest: {
    sanitization: {
      appid: { type: 'string', rules:['trim'] },
      comment_id: { $objectId: 1 },
      enabled: { type: 'boolean' },
      options: {
        type: 'object'
      },
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
      enabled: { type: 'boolean' },
      options: {
        type: 'object'
      },
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
  test: {
    sanitization: {
      name: { type: 'string' },
      type: { type: 'string' },
      company_id: { $objectId: 1 },
      departments: {
        type: 'array',
        items: { $objectId: 1 }
      },
    },
    validation: {
      name: { type: 'string' },
      type: { type: 'string' },
      company_id: { $objectId: 1 },
      departments: {
        type: 'array',
        items: { $objectId: 1 }
      },
    }
  }
};

export const validate = buildValidator(schema);
