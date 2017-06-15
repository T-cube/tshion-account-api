import { buildValidator } from 'lib/inspector';
import C, { ENUMS } from './constants';

const schema={
  info: {
    sanitization: {
      activity_id: { $objectId: 1 },
      content: { type: 'string' },
    },
    validation: {
      activity_id: { $objectId: 1 },
      content: { type: 'string' },
    }
  },
  list: {
    sanitization: {
      range: { type: 'string' },
      target: { type: 'string' },
    },
    validation: {
      range: { $enum: ENUMS.LIST_RANGE },
      target: { $enum: ENUMS.LIST_TARGET },
    }
  },
  activity: {
    sanitization: {
      name: { type: 'string' },
      type: { type: 'string' },
      company_id: { $objectId: 1 },
      time_start: { $date: 1 },
      time_end: { $date: 1 },
      departments: {
        type: 'array',
        items: { $objectId: 1 }
      },
      content: { type: 'string' },
      attachments: {
        type: 'array',
        items: {
          type: 'object',
          optional: true,
          properties: {
            _id: { $objectId: 1 },
            name: { type: 'string' },
            url: { type: 'string' },
          }
        }
      },
      sign_in_require: { type: 'boolean' },
      loop: { type: 'boolean' },
      is_public: { type: 'boolean' },
      accept_require: { type: 'boolean' },
      creator: { $objectId: 1 },
      assistants: {
        type: 'arrary',
        items: {
          $objectId: 1,
          optional: true,
        }
      },
      members: {
        type: 'arrary',
        items: {
          $objectId: 1,
          optional: true,
        }
      },
      followers: {
        type: 'arrary',
        items: {
          $objectId: 1,
          optional: true,
        }
      },
      room: {
        type: 'object',
        properties: {
          _id: { $objectId: 1 },
          manager: { $objectId: 1 },
          equipments: {
            type: 'array',
            items: {
              $objectId: 1,
              optional: true,
            }
          }
        }
      },
    },
    validation: {
      name: { type: 'string' },
      type: { type: 'string' },
      company_id: { $objectId: 1 },
      time_start: { $date: 1 },
      time_end: { $date: 1 },
      departments: {
        type: 'array',
        items: { $objectId: 1 }
      },
      content: { type: 'string' },
      attachments: {
        type: 'array',
        items: {
          type: 'object',
          optional: true,
          properties: {
            _id: { $objectId: 1 },
            name: { type: 'string' },
            url: { type: 'string' },
          }
        }
      },
      sign_in_require: { type: 'boolean' },
      loop: { type: 'boolean' },
      is_public: { type: 'boolean' },
      accept_require: { type: 'boolean' },
      creator: { $objectId: 1 },
      assistants: {
        type: 'arrary',
        items: {
          $objectId: 1,
          optional: true,
        }
      },
      members: {
        type: 'arrary',
        items: {
          $objectId: 1,
          optional: true,
        }
      },
      followers: {
        type: 'arrary',
        items: {
          $objectId: 1,
          optional: true,
        }
      },
      room: {
        type: 'object',
        properties: {
          _id: { $objectId: 1 },
          manager: { $objectId: 1 },
          equipments: {
            type: 'array',
            items: {
              $objectId: 1,
              optional: true,
            }
          }
        }
      },
    }
  }
};

export const validate = buildValidator(schema);
