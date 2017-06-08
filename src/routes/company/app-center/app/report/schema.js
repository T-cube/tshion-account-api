import { buildValidator } from 'lib/inspector';

const schema={
  list: {
    sanitization: {
      page: { type: 'integer' },
      type: { type: 'string' },
      pagesize: { type: 'integer' },
      status: { type: 'string', optional: true },
    },
    validation: {
      page: { type:'integer', gte: 1 },
      type: { $enum: ['inbox', 'outbox'], code: 'invalid_box_check' },
      pagesize: { type:'integer', gte: 1 },
      status: { $enum: ['draft', 'applied', 'agreed', 'rejected'], optional: true },
    }
  },
  info: {
    sanitization: {
      report_id: { $objectId: 1 },
    },
    validation: {
      report_id: { $objectId: 1 },
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
