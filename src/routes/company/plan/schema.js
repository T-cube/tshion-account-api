import { buildValidator } from 'lib/inspector';
import C, { ENUMS } from 'lib/constants';

// const logSchema = {
//   sanitization: {
//     status: { type: 'string' },
//     user_id: { $objectId: 1 },
//     comment: { type: 'string' },
//     date_create: { type: 'date' },
//   },
//   validation: {
//     status: { type: 'string' },
//     user_id: { $objectId: 1 },
//     comment: { type: 'string' },
//     date_create: { type: 'date' },
//   },
// };

const addressSchema = {
  sanitization: {
    type: 'object',
    properties: {
      country: { type: 'string' },
      province: { type: 'string' },
      city: { type: 'string' },
      district: { type: 'string' },
      address: { type: 'string' },
    }
  },
  validation: {
    type: 'object',
    properties: {
      country: { type: 'string' },
      province: { type: 'string' },
      city: { type: 'string' },
      district: { type: 'string' },
      address: { type: 'string' },
    }
  },
};

const industry = {
  sanitization: {
    type: 'object',
    properties: {
      classify: { type: 'string' },
      industry: { type: 'string' },
    }
  },
  validation: {
    type: 'object',
    properties: {
      classify: { type: 'string' },
      industry: { type: 'string' },
    }
  },
};

const schema = {
  create_order: {
    sanitization: {
      plan: { type: 'string', optional: true },
      order_type: { type: 'string' },
      member_count: { type: 'integer', optional: true },
      times: { type: 'integer', optional: true },
      coupon: { type: 'string', optional: true },
    },
    validation: {
      plan: { $enum: [C.TEAMPLAN.PRO, C.TEAMPLAN.ENT], optional: true },
      order_type: { $enum: ENUMS.ORDER_TYPE },
      member_count: { type: 'integer', optional: true },
      times: { type: 'integer', optional: true },
      coupon: { type: 'string', optional: true },
    },
  },
  create_order_newly: {
    sanitization: {
      plan: { type: 'string' },
      order_type: { type: 'string' },
      member_count: { type: 'integer' },
      times: { type: 'integer' },
      coupon: { type: 'string', optional: true },
    },
    validation: {
      plan: { $enum: [C.TEAMPLAN.PRO, C.TEAMPLAN.ENT] },
      order_type: { $enum: ENUMS.ORDER_TYPE },
      member_count: { type: 'integer' },
      times: { type: 'integer' },
      coupon: { type: 'string', optional: true },
    },
  },
  create_order_patch: {
    sanitization: {
      order_type: { type: 'string' },
      coupon: { type: 'string', optional: true },
    },
    validation: {
      order_type: { $enum: ENUMS.ORDER_TYPE },
      coupon: { type: 'string', optional: true },
    },
  },
  create_order_degrade: {
    sanitization: {
      plan: { type: 'string' },
      order_type: { type: 'string' },
      member_count: { type: 'integer', optional: true, def: 0 },
    },
    validation: {
      plan: { $enum: [C.TEAMPLAN.PRO, C.TEAMPLAN.ENT, C.TEAMPLAN.FREE] },
      order_type: { $enum: ENUMS.ORDER_TYPE },
      member_count: { type: 'integer', optional: true },
    },
  },
  create_order_upgrade: {
    sanitization: {
      plan: { type: 'string' },
      order_type: { type: 'string' },
      member_count: { type: 'integer' },
      coupon: { type: 'string', optional: true },
    },
    validation: {
      plan: { $enum: [C.TEAMPLAN.PRO, C.TEAMPLAN.ENT] },
      order_type: { $enum: ENUMS.ORDER_TYPE },
      member_count: { type: 'integer' },
      coupon: { type: 'string', optional: true },
    },
  },
  create_order_renewal: {
    sanitization: {
      order_type: { type: 'string' },
      times: { type: 'integer' },
      coupon: { type: 'string', optional: true },
    },
    validation: {
      order_type: { $enum: ENUMS.ORDER_TYPE },
      times: { type: 'integer' },
      coupon: { type: 'string', optional: true },
    },
  },
  pay: {
    sanitization: {
      payment_method: { type: 'string' },
    },
    validation: {
      payment_method: { $enum: ['alipay', 'wxpay', 'balance'] },
    },
  },
  recharge: {
    sanitization: {
      amount: { type: 'integer' },
      payment_method: { type: 'string' },
    },
    validation: {
      amount: { type: 'integer' },
      payment_method: { $enum: ['wxpay', 'alipay'] },
    },
  },
  trial: {
    sanitization: {
      plan: { type: 'string' },
    },
    validation: {
      plan: { $enum: [C.TEAMPLAN.PRO, C.TEAMPLAN.ENT] },
    },
  },
  cancel: {
    sanitization: {
      plan: { type: 'string' },
      status: { type: 'string' },
    },
    validation: {
      plan: { $enum: [C.TEAMPLAN.PRO, C.TEAMPLAN.ENT] },
      status: { $enum: [C.AUTH_STATUS.CANCELLED] },
    },
  },
  auth_pro: {
    sanitization: {
      contact: {
        type: 'object',
        optional: true,
        properties: {
          realname: { type: 'string' },
          gender: { type: 'string' },               // Enum:F,M
          phone: { type: 'string' },
          address: addressSchema.sanitization,
          // 实名信息，仅在专业版认证时需要
          realname_ext: {
            type: 'object',
            properties: {
              idcard: { type: 'string', rules: ['lower', 'trim'] },              // 身份证编码
              idcard_photo: {
                type: 'array',
                items: {$objectId: 1}
              },
            }
          },
        }
      },
      // 团队信息
      team: {
        type: 'object',
        properties: {
          team_name: { type: 'string' },
          location: addressSchema.sanitization,
          industry: industry.sanitization,
          scale: { type: 'string' },
          description: { type: 'string' },
        }
      },
    },
    validation: {
      contact: {
        type: 'object',
        optional: true,
        properties: {
          realname: { type: 'string', minLength: 2 },
          gender: { type: 'string', $enum: ENUMS.GENDER },
          phone: { $phone: 1 },
          address: addressSchema.validation,
          realname_ext: {
            type: 'object',
            properties: {
              idcard: { $idcard: 1 },
              idcard_photo: {
                type: 'array',
                items: {$objectId: 1}
              },
            }
          },
        }
      },
      team: {
        type: 'object',
        properties: {
          team_name: { type: 'string' },
          location: addressSchema.validation,
          industry: industry.validation,
          scale: { type: 'string' },
          description: { type: 'string', minLength: 3 },
        }
      },
    },
  },

  auth_ent: {
    sanitization: {
      contact: {
        type: 'object',
        properties: {
          realname: { type: 'string' },
          gender: { type: 'string' },               // Enum:F,M
          position: { type: 'string' },
          phone: { type: 'string' },
        }
      },
      enterprise: {
        type: 'object',
        properties: {
          team_name: { type: 'string' },
          location: addressSchema.sanitization,
          industry: industry.sanitization,
          scale: { type: 'string' },
          description: { type: 'string' },
          certificate_type: { type: 'string' },
          certificate_number: { type: 'string' },
          certificate_pic: {
            type: 'array',
            items: {$objectId: 1}
          },
        }
      },
    },
    validation: {
      contact: {
        type: 'object',
        properties: {
          realname: { type: 'string', minLength: 2 },
          gender: { type: 'string', $enum: ENUMS.GENDER },
          position: { type: 'string' },
          phone: { $phone: 1 },
        }
      },
      enterprise: {
        type: 'object',
        properties: {
          team_name: { type: 'string' },
          location: addressSchema.validation,
          industry: industry.validation,
          scale: { type: 'string' },
          description: { type: 'string', minLength: 3 },
          certificate_type: { $enum: ['license', 'code'] },
          certificate_number: { type: 'string' },
          certificate_pic: {
            type: 'array',
            items: {$objectId: 1}
          },
        }
      },
    },
  },
  address: {
    sanitization: {
      province: { type: 'string' },
      city: { type: 'string' },
      district: { type: 'string' },
      postcode: { type: 'string' },
      address: { type: 'string' },
      contact: { type: 'string' },
      phone: { type: 'string' },
    },
    validation: {
      province: { type: 'string' },
      city: { type: 'string' },
      district: { type: 'string' },
      postcode: { type: 'string' },
      address: { type: 'string' },
      contact: { type: 'string' },
      phone: { type: 'string' },
    },
  },
  address_default: {
    sanitization: {
      address_id: { $objectId: 1 },
    },
    validation: {
      address_id: { $objectId: 1 },
    },
  },
  create_invoice: {
    sanitization: {
      order_list: {
        type: 'array',
        items: { $objectId: 1 }
      },
      address_id: { $objectId: 1 },
    },
    validation: {
      order_list: {
        type: 'array',
        items: { $objectId: 1 }
      },
      address_id: { $objectId: 1 },
    },
  },
};

export const validate = buildValidator(schema);
