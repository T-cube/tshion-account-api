import { buildValidator } from 'lib/inspector';
import C, { ENUMS } from './constants';

const schema={
  list: {
    sanitization: {
      page: { type: 'integer' },
      type: { type: 'string' },
      pagesize: { type: 'integer' },
      reporter: { $objectId: 1, optional: true },
      status: { type: 'string', optional: true },
      start_date: { $date: 1, optional: true },
      end_date: { $date: 1, optional: true },
    },
    validation: {
      page: { type:'integer', gte: 1 },
      type: { $enum: ['inbox', 'outbox'], code: 'invalid_box_check' },
      pagesize: { type:'integer', gte: 1 },
      status: { $enum: ENUMS.REPORT_STATUS, optional: true },
      reporter: { $objectId: 1, optional: true },
      start_date: { type: ['date', 'null'], optional: true },
      end_date: { type: ['date', 'null'], optional: true },
    }
  },
  info: {
    sanitization: {
      report_id: { $objectId: 1 },
      status: { type: 'string' },
      content: { type: 'string' },
    },
    validation: {
      report_id: { $objectId: 1 },
      status: { $enum: [C.REPORT_STATUS.AGREED, C.REPORT_STATUS.REJECTED] },
      content: { type: 'string' },
    }
  },
  change: {
    sanitization: {
      date_report: { $date: 1, optional: true },
      report_target: { $objectId: 1, optional: true },
      copy_to: {
        type: 'array',
        optional: true,
        items: { $objectId: 1}
      },
      content: { type: 'string', optional: true },
      status: { type: 'string', optional: true },
      type: { type: 'string', optional: true },
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
    },
    validation: {
      date_report: { type: ['date', 'null'], optional: true },
      report_target: { $objectId: 1, optional: true },
      copy_to: {
        type: 'array',
        optional: true,
        items: { $objectId: 1}
      },
      content: { type: 'string', optional: true },
      status: { $enum: [C.REPORT_STATUS.APPLIED, C.REPORT_STATUS.DRAFT], optional: true },
      type: { $enum: ENUMS.REPORT_TYPE, optional: true },
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
    }
  },
  report: {
    sanitization: {
      user_id: { $objectId: 1 },
      company_id: { $objectId: 1 },
      date_report: { $date: 1 },
      report_target: { $objectId: 1 },
      copy_to: {
        type: 'array',
        items: { $objectId: 1}
      },
      content: { type: 'string' },
      status: { type: 'string' },
      type: { type: 'string' },
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
    },
    validation: {
      user_id: { $objectId: 1 },
      company_id: { $objectId: 1 },
      date_report: { $date: 1 },
      report_target: { $objectId: 1 },
      copy_to: {
        type: 'array',
        items: { $objectId: 1}
      },
      content: { type: 'string' },
      status: { $enum: [C.REPORT_STATUS.APPLIED, C.REPORT_STATUS.DRAFT] },
      type: { $enum: ENUMS.REPORT_TYPE },
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
    }
  }
};

export const validate = buildValidator(schema);
