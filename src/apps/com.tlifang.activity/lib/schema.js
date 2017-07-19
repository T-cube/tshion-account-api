import { buildValidator } from 'lib/inspector';
import C, { ENUMS } from './constants';

const schema={
  info: {
    sanitization: {
      activity_id: { $objectId: 1 },
      equipment_id: { $objectId: 1 },
      content: { type: 'string' },
      approval_range: { type: 'string' },
      room_id: { $objectId: 1 },
      approval_id: { $objectId: 1 },
    },
    validation: {
      activity_id: { $objectId: 1 },
      equipment_id: { $objectId: 1 },
      content: { type: 'string' },
      approval_range: { $enum: ENUMS.APPROVAL_RANGE },
      room_id: { $objectId: 1 },
      approval_id: { $objectId: 1 },
    }
  },
  room: {
    sanitization: {
      name: { type: 'string', rules: ['trim'] },
      place: { type: 'string', rules: ['trim'] },
      type: { type: 'string', rules: ['trim'] },
      manager: { $objectId: 1 },
      max_member: { type: 'integer', gte: 1  },
      equipments: {
        type: 'array',
        optional: true,
        items: {
          type: 'object',
          optional: true,
          properties: {
            optional: { type: 'boolean' },
            name: { type: 'string', rules: ['trim'] },
          }
        }
      },
      order_require: { type: 'boolean' },
      approval_require: { type: 'boolean' },
      description: { type: 'string', optional: true },
    },
    validation: {
      name: { type: 'string', minLength: 1 },
      place: { type: 'string', minLength: 1 },
      type: { $enum: ENUMS.ROOM_TYPE },
      manager: { $objectId: 1 },
      max_member: { type: 'integer', gte: 1  },
      equipments: {
        type: 'array',
        optional: true,
        items: {
          type: 'object',
          optional: true,
          properties: {
            optional: { type: 'boolean' },
            name: { type: 'string', minLength: 1 },
          }
        }
      },
      order_require: { type: 'boolean' },
      approval_require: { type: 'boolean' },
      description: { type: 'string', optional: true },
    }
  },
  roomChange: {
    sanitization: {
      name: { type: 'string', rules: ['trim'], optional: true },
      type: { type: 'string', optional: true },
      max_member: { type: 'integer', gte: 1 , optional: true },
      order_require: { type: 'boolean', optional: true },
      approval_require: { type: 'boolean', optional: true },
      description: { type: 'string', optional: true },
    },
    validation: {
      name: { type: 'string', minLength: 1, optional: true },
      type: { $enum: ENUMS.ROOM_TYPE, optional: true },
      max_member: { type: 'integer', gte: 1, optional: true  },
      order_require: { type: 'boolean', optional: true },
      approval_require: { type: 'boolean', optional: true },
      description: { type: 'string', optional: true },
    }
  },
  equipment: {
    sanitization: {
      name: { type: 'string', rules: ['trim'], optional: true },
      optional: { type: 'boolean', optional: true },
    },
    validation: {
      name: { type: 'string', minLength: 1, optional: true },
      optional: { type: 'boolean', optional: true },
    }
  },
  list: {
    sanitization: {
      date_start: { $date: 1, optional: true },
      date_end: { $date: 1, optional: true },
      target: { type: 'string' },
      last_id: { $objectId: 1 , optional: true },
    },
    validation: {
      date_start: { $date: 1, optional: true },
      date_end: { $date: 1, optional: true },
      target: { $enum: ENUMS.LIST_TARGET },
      last_id: { $objectId: 1 , optional: true },
    }
  },
  approvalList: {
    sanitization: {
      page: { type: 'integer' },
      pagesize: { type: 'integer' },
    },
    validation: {
      page: { type: 'integer', gte: 1 },
      pagesize: { type: 'integer', gte: 1 },
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
  },
  activityChange: {
    sanitization: {
      name: { type: 'string', optional: true },
      type: { type: 'string', optional: true },
      time_start: { $date: 1, optional: true },
      time_end: { $date: 1, optional: true },
      departments: {
        type: 'array',
        optional: true,
        items: { $objectId: 1, optional: true }
      },
      content: { type: 'string', optional: true },
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
      sign_in_require: { type: 'boolean', optional: true },
      loop: { type: 'boolean', optional: true },
      is_public: { type: 'boolean', optional: true },
      accept_require: { type: 'boolean', optional: true },
      certified_member: { type: 'boolean', optional: true },
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
        optional: true,
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
      name: { type: 'string', optional: true },
      type: { type: 'string', optional: true },
      time_start: { $date: 1, optional: true },
      time_end: { $date: 1, optional: true },
      departments: {
        type: 'array',
        optional: true,
        items: { $objectId: 1, optional: true }
      },
      content: { type: 'string', optional: true },
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
      sign_in_require: { type: 'boolean', optional: true },
      loop: { type: 'boolean', optional: true },
      is_public: { type: 'boolean', optional: true },
      accept_require: { type: 'boolean', optional: true },
      certified_member: { type: 'boolean', optional: true },
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
        optional: true,
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
  },
};

export const validate = buildValidator(schema);
