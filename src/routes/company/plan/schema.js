import { buildValidator } from 'lib/inspector';
import C, { ENUMS } from 'lib/constants';

const schema = {
  create_order: {
    sanitization: {
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
  }
};

export const validate = buildValidator(schema);
