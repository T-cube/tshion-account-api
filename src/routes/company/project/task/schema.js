import C, { ENUMS } from 'lib/constants';
import { buildValidator } from 'lib/inspector';

const schema = {
  task: {
    sanitization: {
      parent_id: { $objectId: 1, optional: true },
      status: { type: 'string' },
      title: { type: 'string' },
      description: { type: 'string', optional: true },
      assignee: { $objectId: 1, optional: true },
      followers: {
        type: 'array',
        optional: true,
        items: {
          $objectId: 1,
          optional: true
        }
      },
      date_start: { $date: 1, optional: true },
      date_due: { $date: 1, optional: true },
      priority: { type: 'integer', optional: true },
      tags: { type: 'array', optional: true,
        items: { $objectId: 1 }
      },
      subtask: {  type: 'array', optional: true,
        items: { type: 'string' },
      },
      loop: {  type: 'object', optional: true,
        properties: {
          type: { type: ['string', null] },
          info: { type: 'array', optional: true },
          end: { type: 'object', optional: true,
            properties: {
              type: { type: ['string', null] },
              date: { $date: 1, optional: true },
              times: { type: 'integer', min: 0, optional: true },
            }
          }
        }
      },
      checker: { $objectId: 1, optional: true },
      attachments: {
        type: 'array', optional: true,
        items: { $objectId: 1 }
      }
    },

    validation: {
      parent_id: { $objectId: 1, optional: true },
      status: { $enum: ENUMS.TASK_STATUS },
      title: { type: 'string' },
      description: { type: 'string', optional: true },
      assignee: { $objectId: 1, optional: true },
      followers: {
        type: 'array',
        optional: true,
        items: {
          $objectId: 1,
          optional: true
        }
      },
      date_start: { type: ['date', 'null'], optional: true },
      date_due: { type: ['date', 'null'], optional: true },
      priority: { $enum: ENUMS.TASK_PRIORITY, optional: true },
      tags: { type: 'array', optional: true,
        items: { $objectId: 1 }
      },
      subtask: { type: 'array', optional: true,
        items: { type: 'string', minLength: 1, maxLength: 200 },
      },
      loop: {
        type: 'object',
        optional: true,
        properties: {
          type: { $enum: [null, 'day', 'weekday', 'month', 'year'] },
          info: { type: 'array', optional: true, maxLength: 31 },
          end: {
            type: 'object',
            optional: true,
            properties: {
              type: { $enum: ['date', 'times', null] },
              date: { $date: 1, optional: true },
              times: { type: 'integer', optional: true },
            }
          }
        }
      },
      checker: {
        $objectId: 1,
        optional: true,
      },
    },
  },

  comment: {
    sanitization: {
      content: { type: 'string' }
    },
    validation: {
      content: { type: 'string', minLength: 2, maxLength: 1000 }
    },
  },

  subtask: {
    sanitization: {
      title: { type: 'string' },
      status: { type: 'string' },
    },
    validation: {
      title: { type: 'string', minLength: 1, maxLength: 200 },
      status: { $enum: [C.TASK_STATUS.PROCESSING, C.TASK_STATUS.COMPLETED] },
    },
  },

};

export const validate = buildValidator(schema);
