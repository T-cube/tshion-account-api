import C, { ENUMS } from 'lib/constants';
import { buildValidator } from 'lib/inspector';

const schema = {
  account_log: {
    sanitization: {
      user: { $objectId: 1 },
      type: { type: 'string' },
      client: { type: 'string' },
      ip: { type: 'string' },
      time: { type: 'date' },
    },
    validation: {
      user: { $objectId: 1 },
      type: { $enum: ENUMS.ACCOUNT_LOG_TYPE },
      client: { $enum: ENUMS.ACCOUNT_CLIENT },
      ip: { type: 'string' },
      time: { type: 'date' },
    },
  }
};

export const validate = buildValidator(schema);
