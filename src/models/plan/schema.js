
import { buildValidator } from 'lib/inspector';
import C, { ENUMS } from 'lib/constants';

const logSchema = {
  sanitization: {
    status: { type: 'string' },
    user_id: { $objectId: 1 },
    comment: { type: 'string' },
    date_create: { type: 'date' },
  },
  validation: {
    status: { type: 'string' },
    user_id: { $objectId: 1 },
    comment: { type: 'string' },
    date_create: { type: 'date' },
  },
};

const addressSchema = {
  sanitization: {
    type: 'object',
    properties: {
      province: { type: 'string' },
      city: { type: 'string' },
      district: { type: 'string' },
      postcode: { type: 'string' },
      address: { type: 'string' },
    }
  },
  validation: {
    type: 'object',
    properties: {
      province: { type: 'string' },
      city: { type: 'string' },
      district: { type: 'string' },
      postcode: { type: 'string' },
      address: { type: 'string' },
    }
  },
};

const schema = {
  log: logSchema,

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
          industry: { type: 'array' },
          scale: { type: 'integer' },
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
              idcard: { $idcard: 1 },              // 身份证编码
            }
          },
        }
      },
      team: {
        type: 'object',
        properties: {
          team_name: { type: 'string' },
          location: addressSchema.validation,
          industry: { type: 'array' },
          scale: { $enum: [1, 10, 50, 100] },
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
          industry: { type: 'array' },
          scale: { type: 'integer' },
          description: { type: 'string' },
          certificate_type: { type: 'string' },
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
          industry: { type: 'array' },
          scale: { $enum: [1, 10, 50, 100] },
          description: { type: 'string', minLength: 3 },
          certificate_type: { $enum: ['license', 'code'] },
        }
      },
    },
  },

  charge_discount: {
    sanitization: {
      discount_no: { type: 'string' },
      title: { type: 'string' },
      amount: { type: 'integer' },
      extra_amount: { type: 'integer' },
      date_create: { type: 'date' },
      date_update: { type: 'date' },
    },
    validation: {},
  }

};

export const validate = buildValidator(schema);
