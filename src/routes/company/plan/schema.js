import { buildValidator } from 'lib/inspector';
import C, { ENUMS } from 'lib/constants';

const schema = {
  create_order: {
    sanitization: {
      plan: { type: 'string' },
      products: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            product_no: { type: 'string' },
            quantity: { type: 'int' },
          }
        }
      },
      coupon: { $objectId: 1, optional: true },
    },
    validation: {
      plan: { $enum: [C.PLAN.TEAMPLAN.PRO, C.PLAN.TEAMPLAN.ENT] },
      products: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            product_no: { type: 'string' },
            quantity: { type: 'int' },
          }
        }
      },
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
      plan: { $enum: [C.PLAN.TEAMPLAN.PRO, C.PLAN.TEAMPLAN.ENT] },
    },
  },
};

export const validate = buildValidator(schema);
