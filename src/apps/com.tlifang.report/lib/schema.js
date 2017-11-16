import { buildValidator } from 'lib/inspector';
import C, { ENUMS } from './constants';

const schema={
  list: {
    sanitization: {
      page: { type: 'integer' },
      pagesize: { type: 'integer' },
      type: { type: 'string' },
      report_type: { type: 'string', optional: true },
      report_target: { $objectId: 1, optional: true },
      reporter: { $objectId: 1, optional: true },
      status: { type: 'string', optional: true },
      start_date: { $date: 1, optional: true },
      end_date: { $date: 1, optional: true },
      key_word: { type: 'string', rules:['trim'], optional: true },
    },
    validation: {
      page: { type:'integer', gte: 1 },
      pagesize: { type:'integer', gte: 1 },
      type: { $enum: ['inbox', 'outbox'], code: 'invalid_box_check' },
      report_type: { $enum: ENUMS.REPORT_TYPE, optional: true },
      status: { $enum: ENUMS.REPORT_STATUS, optional: true },
      report_target: { $objectId: 1, optional: true },
      reporter: { $objectId: 1, optional: true },
      start_date: { type: ['date', 'null'], optional: true },
      end_date: { type: ['date', 'null'], optional: true },
      key_word: { type: 'string', optional: true },
    }
  },
  detail: {
    sanitization: {
      report_target: { $objectId: 1, optional: true },
      reporter: { $objectId: 1, optional: true },
      type: { type: 'string', def: 'outbox' },
      report_type: { type: 'string', def: 'day'},
    },
    validation: {
      report_target: { $objectId: 1, optional: true },
      reporter: { $objectId: 1, optional: true },
      type: { $enum: ['inbox', 'outbox'], code: 'invalid_box_check' },
      report_type: { $enum: ENUMS.REPORT_TYPE },
    }
  },
  month: {
    sanitization: {
      report_id: { $objectId: 1 },
      // type: { type: 'string' },
      // report_type: { type: 'string' },
      // report_target: { $objectId: 1 },
      // status: { type: 'string' },
      // year: { type: 'integer' },
      // month: { type: 'integer' },
    },
    validation: {
      report_id: { $objectId: 1 },
      // type: { $enum: ['inbox', 'outbox'], code: 'invalid_box_check' },
      // report_type: { $enum: ENUMS.REPORT_TYPE },
      // report_target: { $objectId: 1 },
      // status: { $enum: ENUMS.REPORT_STATUS },
      // year: { type: 'integer', gte: 1970 },
      // month: { type: 'integer', gte: 1, lte: 12 },
    }
  },
  info: {
    sanitization: {
      report_id: { $objectId: 1 },
      status: { type: 'string' },
      content: { type: 'string', rules:['trim'] },
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
        items: { $objectId: 1, optional: true }
      },
      content: { type: 'string', optional: true },
      status: { type: 'string', optional: true },
      type: { type: 'string', optional: true },
      attachments: {
        type: 'array',
        optional: true,
        items: { $objectId: 1 }
      },
    },
    validation: {
      date_report: { $date: 1, optional: true },
      report_target: { $objectId: 1, optional: true },
      copy_to: {
        type: 'array',
        optional: true,
        items: { $objectId: 1, optional: true }
      },
      content: { type: 'string', optional: true },
      status: { $enum: [C.REPORT_STATUS.APPLIED, C.REPORT_STATUS.DRAFT], optional: true },
      type: { $enum: ENUMS.REPORT_TYPE, optional: true },
      attachments: {
        type: 'array',
        optional: true,
        items: { $objectId: 1 }
      },
    }
  },
  report: {
    sanitization: {
      date_report: { $date: 1 },
      report_target: { $objectId: 1 },
      copy_to: {
        type: 'array',
        optional: true,
        items: { $objectId: 1, optional: true }
      },
      content: { type: 'string' },
      status: { type: 'string' },
      type: { type: 'string' },
      attachments: {
        type: 'array',
        optional: true,
        items: { $objectId: 1 }
      },
    },
    validation: {
      date_report: { $date: 1 },
      report_target: { $objectId: 1 },
      copy_to: {
        type: 'array',
        optional: true,
        items: { $objectId: 1, optional: true }
      },
      content: { type: 'string' },
      status: { $enum: [C.REPORT_STATUS.APPLIED, C.REPORT_STATUS.DRAFT] },
      type: { $enum: ENUMS.REPORT_TYPE },
      attachments: {
        type: 'array',
        optional: true,
        items: { $objectId: 1 }
      },
    }
  }
};

export const validate = buildValidator(schema);
