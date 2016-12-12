import { buildValidator } from 'lib/inspector';
import C, { ENUMS } from 'lib/constants';

const schema = {
  create_order: {
    sanitization: {
      plan: { type: 'string', optional: true },
      order_type: { type: 'string' },
      member_count: { type: 'int', optional: true },
      times: { type: 'number', optional: true },
      coupon: { $objectId: 1, optional: true },
    },
    validation: {
      plan: { $enum: [C.TEAMPLAN.PRO, C.TEAMPLAN.ENT], optional: true },
      order_type: { $enum: ENUMS.ORDER_TYPE },
      member_count: { type: 'int', optional: true },
      times: { type: 'number', optional: true },
      coupon: { $objectId: 1, optional: true },
    },
  },
  recharge: {
    sanitization: {
      amount: { type: 'int' },
      payment_method: { type: 'string' },
    },
    validation: {},
  },
  trial: {
    sanitization: {
      plan: { type: 'string' },
    },
    validation: {
      plan: { $enum: [C.TEAMPLAN.PRO, C.TEAMPLAN.ENT] },
    },
  },
};

export const validate = buildValidator(schema);
