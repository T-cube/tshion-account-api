import { buildValidator } from 'lib/inspector';
import C, { ENUMS } from 'lib/constants';

const schema = {
  create_order: {
    sanitization: {
      month_count: { type: 'int' },
      user_count: { type: 'int' },
      coupons: { $objectId: 1 },
    },
    validation: {},
  },
  recharge: {
    sanitization: {
      amount: { type: 'int' },
      payment_method: { type: 'string' },
    },
    validation: {},
  }
};

export const validate = buildValidator(schema);
