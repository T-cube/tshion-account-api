import { ENUMS } from 'lib/constants';
import { buildValidator } from 'lib/inspector';

const schema = {
  info: {
    sanitization: {
      name: { type: 'string' },
      description: { type: 'string', optional: true },
      birthdate: { type: 'date', optional: true },
      sex: { type: 'string', optional: true },
      address: {
        type: 'object',
        optional: true,
        properties: {
          country: { type: 'string' },
          province: { type: 'string' },
          city: { type: 'string' },
          district: { type: 'string', optional: true },
          address: { type: 'string', optional: true },
        },
      },
    },
    validation: {
      name: { type: 'string', minLength: 2, maxLength: 50 },
      description: { type: 'string', maxLength: 500, optional: true },
      birthdate: { type: 'date', optional: true },
      sex: { $enum: ENUMS.SEX, optional: true },
      address: {
        type: 'object',
        optional: true,
        properties: {
          country: { type: 'string' },
          province: { type: 'string' },
          city: { type: 'string' },
          district: { type: 'string', optional: true },
          address: { type: 'string', optional: true },
        },
      },
    },
  },
  settings: {
    sanitization: {
      locale: { type: 'string', optional: true },
      timezone: { type: 'string', optional: true },
      current_company: { $ObjectId: true, optional: true },
    },
    validation: {
      locale: { type: 'string', optional: true },
      timezone: { $timezone: true, optional: true },
      current_company: { $ObjectId: true, optional: true },
    },
  },
  options: {
    sanitization: {
      notice_request: { type: 'boolean', optional: true },
      notice_project: { type: 'boolean', optional: true },
    },
    validation: {
      notice_request: { type: 'boolean', optional: true },
      notice_project: { type: 'boolean', optional: true },
    },
  },
};

export const validate = buildValidator(schema);
