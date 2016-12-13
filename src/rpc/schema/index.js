import { ENUMS } from 'lib/constants';
import { buildValidator } from 'lib/inspector';

const schema = {
  qrcode: {
    sanitization: {
      _id: { type: 'int', optional: true },
      name: { type: 'string', minLength: 1, rules: ['trim', 'title'] },
      description: { type: 'string', optional: true },
      status: { type: 'string', optional: true },
    },
    validation: {
      _id: { type: 'int', optional: true },
      name: { type: 'string' },
      description: { type: 'string', optional: true },
      status: { $enum: ['deleted', 'normal'], optional: true },
    }
  },
  plan_audit: {
    sanitization: {
      auth_id: { $objectId: 1 },
      status: { type: 'string' },
      comment: { type: 'string' },
      operator_id: { $objectId: 1 },
    },
    validation: {
      auth_id: { $objectId: 1 },
      status: { $enum: ['rejected', 'accepted'] },
      comment: { type: 'string', minLength: 3 },
      operator_id: { $objectId: 1 },
    },
  }
};

export const validate = buildValidator(schema);
