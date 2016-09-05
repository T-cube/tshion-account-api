import { ENUMS } from 'lib/constants';

export let sanitization = {
  // You can edit the sanitization too
  type: 'object',
  properties: {
    title: { type: 'string' },
    content: { type: 'string' },
    type: { type: 'string' },
    is_published: { type: 'boolean' },
    from: {
      type: 'object',
      properties: {
        creator: { $objectId: true },
        department: { $objectId: true, optional: true },
      }
    },
    to: {
      optional: true,
      type: 'object',
      properties: {
        member: {
          type: 'array',
          optional: true,
          items: { $objectId: true, optional: true }
        },
        department: {
          type: 'array',
          optional: true,
          items: { $objectId: true, optional: true }
        },
      }
    },
    date_publish: { type: 'date', optional: true },
  }
};

export let validation = {
  type: 'object',
  properties: {
    title: { type: 'string', minLength: 1, error: '请填写标题' },
    content: { type: 'string', minLength: 1, maxLength: 1000000 },
    type: { $enum: ENUMS.ANNOUNCEMENT_TYPE },
    is_published: { type: 'boolean' },
    from: {
      type: 'object',
      properties: {
        creator: { $objectId: true },
        department: { $objectId: true, optional: true }
      }
    },
    to: {
      type: 'object',
      optional: true,
      properties: {
        member: {
          type: 'array',
          optional: true,
          items: { $objectId: true, optional: true }
        },
        department: {
          type: 'array',
          optional: true,
          items: { $objectId: true, optional: true }
        },
      }
    },
    date_publish: { type: 'date', optional: true },
  }
};
