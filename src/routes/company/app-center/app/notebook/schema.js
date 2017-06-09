import { buildValidator } from 'lib/inspector';

const schema = {
  notebook: {
    sanitization: {
      tag_id: { $objectId: 1 },
      note_id: { $objectId: 1 },
      notebook_id: { $objectId: 1 },
      tag_name: { type: 'string' },
      notebook_name: { type: 'string' },
      note: {
        title: { type: 'string' },
        content: { type: 'string' },
        tags: {
          type: 'array',
          items: { $objectId: 1 },
        },
        notebook: { $objectId:1 },
        shared: { type: 'boolean' }
      },
      change: {
        title: { type: 'string', optional: true },
        content: { type: 'string', optional: true },
        tags: {
          type: 'array',
          optional: true,
          items: { $objectId: 1 },
        },
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
      tag_name: { type: 'string' },
      notebook_name: { type: 'string' },
      note: {
        title: { type: 'string' },
        content: { type: 'string' },
        tags: {
          type: 'array',
          items: { $objectId: 1 },
        },
        notebook: { $objectId:1 },
        shared: { type: 'boolean' }
      },
      change: {
        title: { type: 'string', optional: true },
        content: { type: 'string', optional: true },
        tags: {
          type: 'array',
          optional: true,
          items: { $objectId: 1 },
        },
        notebook: { $objectId:1, optional: true },
        shared: { type: 'boolean', optional: true }
      },
      comment: { type: 'string' },
      shared: { type: 'boolean' },
    }
  }
};

export const validate = buildValidator(schema);
