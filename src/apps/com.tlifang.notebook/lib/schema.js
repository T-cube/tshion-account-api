import { buildValidator } from 'lib/inspector';

const schema = {
  limit: {
    sanitization: {
      last_id: { $objectId: 1, optional: true },
      sort_type: { type: 'string' },
    },
    validation: {
      last_id: { $objectId: 1, optional: true },
      sort_type: { $enum: ['date_update', 'date_create', 'notebook', 'title'] },
    }
  },
  notebook: {
    sanitization: {
      tag_id: { $objectId: 1 },
      note_id: { $objectId: 1 },
      notebook_id: { $objectId: 1 },
      name: { type: 'string', rules:['trim'] },
      note: {
        title: { type: 'string' },
        content: { type: 'string' },
        tags: {
          type: 'array',
          optional: true,
          items: { $objectId: 1, optional: true },
        },
        notebook: { $objectId:1 },
        shared: { type: 'boolean' }
      },
      change: {
        title: { type: 'string', optional: true },
        content: { type: 'string', optional: true },
        notebook: { $objectId:1, optional: true },
        shared: { type: 'boolean', optional: true }
      },
      comment: { type: 'string' },
      shared: { type: 'boolean' },
    },
    validation: {
      tag_id: { $objectId: 1 },
      note_id: { $objectId: 1 },
      notebook_id: { $objectId: 1 },
      name: { type: 'string' },
      note: {
        title: { type: 'string' },
        content: { type: 'string' },
        tags: {
          type: 'array',
          optional: true,
          items: { $objectId: 1, optional: true },
        },
        notebook: { $objectId:1 },
        shared: { type: 'boolean' }
      },
      change: {
        title: { type: 'string', optional: true },
        content: { type: 'string', optional: true },
        notebook: { $objectId:1, optional: true },
        shared: { type: 'boolean', optional: true }
      },
      comment: { type: 'string' },
      shared: { type: 'boolean' },
    }
  }
};

export const validate = buildValidator(schema);
