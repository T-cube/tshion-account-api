import { buildValidator } from 'lib/inspector';
import C, { ENUMS } from './constants';

const schema={
  info: {
    sanitization: {
      activity_id: { $objectId: 1 },
      content: { type: 'string' },
      approval_range: { type: 'string' },
      room_id: { $objectId: 1 },
      approval_id: { $objectId: 1 },
    },
    validation: {
      activity_id: { $objectId: 1 },
      content: { type: 'string' },
      approval_range: { $enum: ENUMS.APPROVAL_RANGE },
      room_id: { $objectId: 1 },
      approval_id: { $objectId: 1 },
    }
  },
  room: {
    sanitization: {
      name: { type: 'string' },
      type: { type: 'string' },
      max_member: { type: 'integer', min: 1 },
      equipments: {
        type: 'array',
        optional: true,
        items: {
          type: 'object',
          optional: true,
          properties: {
            optional: { type: 'boolean' },
            name: { type: 'string' },
          }
        }
      },
      order_require: { type: 'boolean' },
      approval_require: { type: 'boolean' },
      description: { type: 'string', optional: true },
    },
    validation: {
      name: { type: 'string' },
      type: { $enum: ENUMS.ROOM_TYPE },
      max_member: { type: 'integer', min: 1 },
      equipments: {
        type: 'array',
        optional: true,
        items: {
          type: 'object',
          optional: true,
          properties: {
            optional: { type: 'boolean' },
            name: { type: 'string' },
          }
        }
      },
      order_require: { type: 'boolean' },
      approval_require: { type: 'boolean' },
      description: { type: 'string', optional: true },
    }
  },
  list: {
    sanitization: {
      range: { type: 'string' },
      target: { type: 'string' },
      last_id: { $objectId: 1 , optional: true },
    },
    validation: {
      range: { $enum: ENUMS.LIST_RANGE },
      target: { $enum: ENUMS.LIST_TARGET },
      last_id: { $objectId: 1 , optional: true },
    }
  },
  apply: {
    sanitization: {
      status: { type: 'string' },
    },
    validation: {
      status: { $enum: [C.APPROVAL_STATUS.AGREED, C.APPROVAL_STATUS.REJECTED] },
    }
  },
  activity: {
    sanitization: {
      name: { type: 'string' },
      type: { type: 'string' },
      time_start: { $date: 1 },
      time_end: { $date: 1 },
      departments: {
        type: 'array',
        items: { $objectId: 1 }
      },
      content: { type: 'string' },
      attachments: {
        type: 'array',
        optional: true,
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
      certified_member: { type: 'boolean' },
      creator: { $objectId: 1 },
      assistants: {
        type: 'arrary',
        optional: true,
        items: {
          $objectId: 1,
          optional: true,
        }
      },
      members: {
        type: 'arrary',
        optional: true,
        items: {
          $objectId: 1,
          optional: true,
        }
      },
      followers: {
        type: 'arrary',
        optional: true,
        items: {
          $objectId: 1,
          optional: true,
        }
      },
      room: {
        type: 'object',
        properties: {
          _id: { $objectId: 1 },
          equipments: {
            type: 'array',
            optional: true,
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
      time_start: { $date: 1 },
      time_end: { $date: 1 },
      departments: {
        type: 'array',
        items: { $objectId: 1 }
      },
      content: { type: 'string' },
      attachments: {
        type: 'array',
        optional: true,
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
      certified_member: { type: 'boolean' },
      creator: { $objectId: 1 },
      assistants: {
        type: 'arrary',
        optional: true,
        items: {
          $objectId: 1,
          optional: true,
        }
      },
      members: {
        type: 'arrary',
        optional: true,
        items: {
          $objectId: 1,
          optional: true,
        }
      },
      followers: {
        type: 'arrary',
        optional: true,
        items: {
          $objectId: 1,
          optional: true,
        }
      },
      room: {
        type: 'object',
        properties: {
          _id: { $objectId: 1 },
          equipments: {
            type: 'array',
            optional: true,
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
