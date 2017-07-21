import { buildValidator } from 'lib/inspector';

const schema = {
  limit: {
    sanitization: {
      last_id: { $objectId: 1, optional: true },
      sort_type: { type: 'string' },
      key_word: { type: 'string', rules: ['trim'], optional: true },
    },
    validation: {
      last_id: { $objectId: 1, optional: true },
      sort_type: { $enum: ['date_update', 'date_create', 'notebook', 'title'] },
      key_word: { type: 'string', minLength: 1, optional: true },
    }
  },
  share: {
    sanitization: {
      member_id: { $objectId: 1 },
      last_id: { $objectId: 1, optional: true },
      sort_type: { type: 'string' },
    },
    validation: {
      member_id: { $objectId: 1 },
      last_id: { $objectId: 1, optional: true },
      sort_type: { $enum: ['date_update', 'date_create', 'likes', 'title'] },
    }
  },
  note: {
    sanitization: {
      title: { type: 'string', rules:['trim'] },
      content: { type: 'string', rules:['trim'] },
      notebook: { $objectId: 1 },
      shared: { type: 'boolean' },
      tags: {
        type: 'array',
        optional: true,
        items: { $objectId: 1, optional: true },
      },
    },
    validation: {
      title: { type: 'string', minLength: 1 },
      content: { type: 'string', minLength: 1 },
      notebook: { $objectId: 1 },
      shared: { type: 'boolean' },
      tags: {
        type: 'array',
        optional: true,
        items: { $objectId: 1, optional: true },
      },
    }
  },
  change: {
    sanitization: {
      title: { type: 'string', optional: true },
      content: { type: 'string', optional: true },
      notebook: { $objectId: 1, optional: true },
      shared: { type: 'boolean', optional: true }
    },
    validation: {
      title: { type: 'string', optional: true },
      content: { type: 'string', optional: true },
      notebook: { $objectId: 1, optional: true },
      shared: { type: 'boolean', optional: true }
    }
  },
  notebook: {
    sanitization: {
      tag_id: { $objectId: 1 },
      comment_id: { $objectId: 1 },
      note_id: { $objectId: 1 },
      notebook_id: { $objectId: 1 },
      name: { type: 'string', rules:['trim'] },
      comment: { type: 'string', rules:['trim'] },
      shared: { type: 'boolean' },
    },
    validation: {
      tag_id: { $objectId: 1 },
      comment_id: { $objectId: 1 },
      note_id: { $objectId: 1 },
      notebook_id: { $objectId: 1 },
      name: { type: 'string', minLength: 1 },
      comment: { type: 'string', minLength: 1 },
      shared: { type: 'boolean' },
    }
  }
};

export const validate = buildValidator(schema);
