import { ENUMS } from 'lib/constants';
import { buildValidator } from 'lib/inspector';

const schema = {
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
  },
  update_product: {
    sanitization: {
      product_id: { $objectId: 1 },
      title: { type: 'string' },
      description: { type: 'string', optional: true },
      original_price: { type: 'integer' },
      amount_min: { type: ['integer', null] },
      amount_max: { type: ['integer', null] },
      stock_total: { type: ['integer', null] },
      stock_current: { type: ['integer', null] },
    },
    validation: {
      product_id: { $objectId: 1 },
      title: { type: 'string', minLength: 3, maxLength: 200 },
      description: { type: 'string', optional: true },
      original_price: { type: 'integer', min: 0 },
      amount_min: { type: ['integer', null], min: 1 },
      amount_max: { type: ['integer', null], min: 1 },
      stock_total: { type: ['integer', null], min: 1 },
      stock_current: { type: ['integer', null], min: 1},
    },
  },
  update_plan: {
    sanitization: {
      plan_id: { $objectId: 1 },
      name: { type: 'string' },
      description: { type: 'string' },
    },
    validation: {
      plan_id: { $objectId: 1 },
      name: { type: 'string', minLength: 3, maxLength: 100 },
      description: { type: 'string', minLength: 3, maxLength: 10000 },
    },
  },
  product_discount: {
    sanitization: {
      product_id: { $objectId: 1 },
      discount_id: { $objectId: 1 },
    },
    validation: {
      product_id: { $objectId: 1 },
      discount_id: { $objectId: 1 },
    },
  },
  discount: {
    sanitization: {
      title: { type: 'string' },
      description: { type: 'string' },
      criteria: {
        type: 'object',
        properties: {
          quantity: { type: 'integer', optional: true },
          total_fee: { type: 'integer', optional: true },
          times: { type: 'integer', optional: true },
        }
      },
      discount: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          number: { type: 'integer', optional: true },
          rate: { type: 'number', optional: true },
          amount: { type: 'integer', optional: true },
          times: { type: 'integer', optional: true },
        }
      },
      period: {
        type: 'object',
        properties: {
          date_start: { type: 'date' },
          date_end: { type: 'date' },
        }
      }
    },
    validation: {
      title: { type: 'string' },
      description: { type: 'string' },
      criteria: {
        type: 'object',
        someKeys: ['quantity', 'total_fee', 'times'],
        properties: {
          quantity: { type: 'integer', optional: true, min: 1 },
          total_fee: { type: 'integer', optional: true, min: 1 },
          times: { type: 'integer', optional: true, min: 1 },
        }
      },
      discount: {
        type: 'object',
        someKeys: ['number', 'rate', 'amount', 'times'],
        properties: {
          type: { $enum: ['number', 'rate', 'amount', 'times'] },
          number: { type: 'integer', optional: true, min: 1 },
          rate: { type: 'number', optional: true, min: 0, max: 0.99 },
          amount: { type: 'integer', optional: true, min: 1 },
          times: { type: 'integer', optional: true, min: 1 },
        }
      },
      period: {
        type: 'object',
        properties: {
          date_start: { type: 'date' },
          date_end: { type: 'date' },
        }
      }
    },
  },
  coupon: {
    sanitization: {
      title: { type: 'string' },
      description: { type: 'string' },
      criteria: {
        type: 'object',
        properties: {
          quantity: { type: 'integer', optional: true },
          total_fee: { type: 'integer', optional: true },
          times: { type: 'integer', optional: true },
        }
      },
      discount: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          number: { type: 'integer', optional: true },
          rate: { type: 'number', optional: true },
          amount: { type: 'integer', optional: true },
        }
      },
      period: {
        type: 'object',
        properties: {
          date_start: { type: 'date' },
          date_end: { type: 'date' },
        }
      },
      stock_total: { type: 'integer' },
      stock_current: { type: 'integer' },
    },
    validation: {
      title: { type: 'string' },
      description: { type: 'string' },
      criteria: {
        type: 'object',
        someKeys: ['quantity', 'total_fee', 'times'],
        properties: {
          quantity: { type: 'integer', optional: true, min: 1 },
          total_fee: { type: 'integer', optional: true, min: 1 },
          times: { type: 'integer', optional: true, min: 1 },
        }
      },
      discount: {
        type: 'object',
        someKeys: ['number', 'rate', 'amount'],
        properties: {
          type: { $enum: ['number', 'rate', 'amount', 'times'] },
          number: { type: 'integer', optional: true, min: 1 },
          rate: { type: 'number', optional: true, min: 0, max: 0.99 },
          amount: { type: 'integer', optional: true, min: 1 },
        }
      },
      period: {
        type: 'object',
        properties: {
          date_start: { type: 'date' },
          date_end: { type: 'date' },
        }
      },
      stock_total: { type: 'integer' },
      stock_current: { type: 'integer' },
    },
  },
  recharge_discount: {
    sanitization: {
      title: { type: 'string' },
      amount: { type: 'integer' },
      extra_amount: { type: 'integer' },
    },
    validation: {
      title: { type: 'string' },
      amount: { type: 'integer', min: 1 },
      extra_amount: { type: 'integer', min: 1 },
    },
  }
};

export const validate = buildValidator(schema);
