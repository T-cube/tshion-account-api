import { buildValidator } from 'lib/inspector';

const schema={
  list: {
    sanitization: {
      page: { type: 'integer' },
      type: { type: 'string' },
      pagesize: { type: 'integer' },
      status: { type: 'string', optional: true },
      start_date: { type: 'date', optional: true },
      end_date: { type: 'date', optional: true },
    },
    validation: {
      page: { type:'integer', gte: 1 },
      type: { $enum: ['inbox', 'outbox'], code: 'invalid_box_check' },
      pagesize: { type:'integer', gte: 1 },
      status: { $enum: ['draft', 'applied', 'agreed', 'rejected'], optional: true },
      start_date: { type: 'date', optional: true },
      end_date: { type: 'date', optional: true },
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
      status: { $enum: ['agreed', 'rejected'] },
      content: { type: 'string' },
    }
  },
  change: {
    sanitization: {
      date_report: { type: 'date', optional: true },
      report_target: { $objectId: 1, optional: true },
      copy_to: {
        type: 'array',
        optional: true,
        items: { $objectId: 1}
      },
      content: { type: 'string', optional: true },
      status: { type: 'string', optional: true },
      type: { type: 'string', optional: true },
      attachment: {
        type: 'array',
        optional: true,
        items: { type: 'string' }
      },
    },
    validation: {
      date_report: { type: 'date', optional: true },
      report_target: { $objectId: 1, optional: true },
      copy_to: {
        type: 'array',
        optional: true,
        items: { $objectId: 1}
      },
      content: { type: 'string', optional: true },
      status: { $enum: ['applied', 'draft'], optional: true },
      type: { $enum: ['day', 'week', 'month'], optional: true },
      attachment: {
        type: 'array',
        optional: true,
        items: { type: 'string' }
      },
    }
  },
  report: {
    sanitization: {
      user_id: { $objectId: 1 },
      company_id: { $objectId: 1 },
      date_report: { type: 'date' },
      report_target: { $objectId: 1 },
      copy_to: {
        type: 'array',
        items: { $objectId: 1}
      },
      content: { type: 'string' },
      status: { type: 'string' },
      type: { type: 'string' },
      attachment: {
        type: 'array',
        items: { type: 'string' }
      },
    },
    validation: {
      user_id: { $objectId: 1 },
      company_id: { $objectId: 1 },
      date_report: { type: 'date' },
      report_target: { $objectId: 1 },
      copy_to: {
        type: 'array',
        items: { $objectId: 1}
      },
      content: { type: 'string' },
      status: { $enum: ['applied', 'draft'] },
      type: { $enum: ['day', 'week', 'month'] },
      attachment: {
        type: 'array',
        items: { type: 'string' }
      },
    }
  }
};

export const validate = buildValidator(schema);
