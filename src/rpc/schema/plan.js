import _ from 'underscore';
import C, { ENUMS } from 'lib/constants';
import { buildValidator } from 'lib/inspector';

const discountSchema = {
  sanitization: {
    title: { type: 'string' },
    description: { type: 'string' },
    order_type: { type: 'array', items: { type: 'string' } },
    criteria: {
      type: 'object',
      properties: {
        type: { type: 'string' },
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
        rate: { type: 'number', optional: true, min: 0, max: 0.99 },
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
    order_type: {
      type: 'array',
      uniqueness: true,
      items: {
        $enum: [C.ORDER_TYPE.NEWLY, C.ORDER_TYPE.UPGRADE, C.ORDER_TYPE.RENEWAL],
      }
    },
    criteria: {
      type: 'object',
      someKeys: ['quantity', 'total_fee', 'times'],
      properties: {
        type: { $enum: ['quantity', 'total_fee', 'times'] },
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
        rate: { type: 'number', optional: true },
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
};

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
      discount: {
        type: 'array',
        uniqueness: true,
        items: { $objectId: 1 },
      },
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
      discount: {
        type: 'array',
        uniqueness: true,
        items: { $objectId: 1 },
      },
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
  discount: discountSchema,
  coupon: {
    sanitization: _.extend({}, discountSchema.sanitization, {
      products: {
        type: 'array',
        items: {
          $objectId: 1
        }
      },
      stock_total: { type: 'integer' },
      stock_current: { type: 'integer' },
    }),
    validation: _.extend({}, discountSchema.validation, {
      products: {
        type: 'array',
        uniqueness: true,
        items: {
          $objectId: 1
        }
      },
      stock_total: { type: 'integer' },
      stock_current: { type: 'integer' },
    }),
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
  },
  send_coupon: {
    sanitization: {
      coupons: {
        type: 'array',
        items: { $objectId: 1 }
      },
      companies: {
        type: 'array',
        items: { $objectId: 1 }
      },
    },
    validation: {
      coupons: {
        type: 'array',
        items: { $objectId: 1 }
      },
      companies: {
        type: 'array',
        items: { $objectId: 1 }
      },
    }
  },
  distribute_coupon: {
    sanitization: {
      coupon_no: {
        type: 'string',
      },
      companies: {
        type: 'array',
        items: { $objectId: 1 }
      },
    },
    validation: {
      coupon_no: {
        type: 'string',
      },
      companies: {
        type: 'array',
        items: { $objectId: 1 }
      },
    }
  },
  invoice_status: {
    sanitization: {
      invoice_id: {$objectId: 1},
      status: {type: 'string'},
      comment: {type: 'string'},
      operator_id: {$objectId: 1},
    },
    validation: {
      invoice_id: {$objectId: 1},
      status: {
        $enum: [C.INVOICE_STATUS.CONFIRMED, C.INVOICE_STATUS.REJECTED, C.INVOICE_STATUS.ISSUED, C.INVOICE_STATUS.COMPLETED]
      },
      comment: {type: 'string'},
      operator_id: {$objectId: 1},
    },
  },
  invoice_send: {
    sanitization: {
      invoice_id: {$objectId: 1},
      operator_id: {$objectId: 1},
      chip_info: {
        type: 'object',
        properties: {
          track_no: {type: 'string'},
          brand: {type: 'string'}
        }
      }
    },
    validation: {
      invoice_id: {$objectId: 1},
      operator_id: {$objectId: 1},
      chip_info: {
        type: 'object',
        properties: {
          track_no: {type: 'string'},
          brand: {type: 'string'}
        }
      }
    },
  },
  invoice_list: {
    sanitization: {
      page: {type: 'integer', optional: true},
      pagesize: {type: 'integer', optional: true},
      status: {type: 'string', optional: true},
      invoice_no: {type: 'string', optional: true},
      company_id: {$objectId: 1, optional: true},
      type: {type: 'string', optional: true},
      keyword: {type: 'string', optional: true},
    },
    validation: {
      page: {type: 'integer', optional: true},
      pagesize: {type: 'integer', optional: true},
      status: {$enum: ENUMS.INVOICE_STATUS, optional: true},
      invoice_no: {type: 'string', optional: true},
      company_id: {$objectId: 1, optional: true},
      keyword: {type: 'string', optional: true},
      type: {type: 'string', optional: true},
    },
  },
};

export const validate = buildValidator(schema);
