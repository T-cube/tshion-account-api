import { buildValidator } from 'lib/inspector';

const schema = {
  stream_data: {
    sanitization: {
      name: { type: 'string', rules: ['trim'] },
      size: { type: 'integer' },
      appid: { type: 'string', rules: ['trim'] },
      type: { type: 'string', rules: ['trim'] },
    },
    validation: {
      name: { type: 'string', minLength: 3 },
      size: { type: 'integer' },
      appid: { type: 'string', minLength: 1 },
      type: { type: 'string', minLength: 1 },
    },
  },
  app_data: {
    sanitization: {
      appid: { type: 'string', rules: ['trim'] },
      type: { type: 'string' , rules:['trim'], optional: true },
      total_installed: { type: 'integer', gte: 1, optional: true },
      description: { type: 'string' , rules:['trim'], optional: true },
      update_info: { type: 'string' , rules:['trim'], optional: true },
      name: { type: 'string' , rules:['trim'], optional: true },
      slideshow: { type: 'array', optional: true, items: { type: 'string', rules:['trim'], optional: true } },
      author: { type: 'string' , rules:['trim'], optional: true },
      star: { type: 'number', optional: true }
    },
    validation: {
      appid: { type: 'string', minLength: 1 },
      type: { type: 'string' , optional: true },
      total_installed: { type: 'integer', gte: 1, optional: true },
      description: { type: 'string' , optional: true },
      update_info: { type: 'string' , optional: true },
      name: { type: 'string' , optional: true },
      slideshow: { type: 'array', optional: true, items: { type: 'string', optional: true } },
      author: { type: 'string' , optional: true },
      star: { type: 'number', gte: 0, lte: 5, optional: true }
    }
  },
  delete_data: {
    sanitization: {
      appid: { type: 'string', rules: ['trim'] },
      url: { type: 'string', rules: ['trim'] },
    },
    validation: {
      appid: {type: 'string', minLength: 1 },
      url: { type: 'string', minLength: 1 }
    }
  }
};
export const validate = buildValidator(schema);
