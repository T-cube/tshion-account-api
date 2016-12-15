
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

const locationSchema = {
  sanitization: {
    type: 'object',
    properties: {
      province: { type: 'string' },
      city: { type: 'string' },
    }
  },
  validation: {
    type: 'object',
    properties: {
      province: { type: 'string' },
      city: { type: 'string' },
    }
  },
};

const schema = {
  log: logSchema,

  auth_pro: {
    sanitization: {
      info: {
        type: 'object',
        properties: {
          contact: {
            type: 'object',
            optional: true,
            properties: {
              realname: { type: 'string' },
              gender: { type: 'string' },               // Enum:F,M
              position: { type: 'string' },
              phone: { type: 'string' },
              address: {
                type: 'object',
                properties: {
                  province: { type: 'string' },
                  city: { type: 'string' },
                  district: { type: 'string' },
                  postcode: { type: 'string' },
                  address: { type: 'string' },
                }
              },
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
              location: locationSchema.sanitization,
              type: { type: 'string' },
              scale: { type: 'integer' },
              description: { type: 'string' },
            }
          },
        }
      },
    },
    validation: {
      info: {
        type: 'object',
        properties: {
          contact: {
            type: 'object',
            optional: true,
            properties: {
              realname: { type: 'string', minLength: 2 },
              gender: { type: 'string', $enum: ENUMS.GENDER },
              position: { type: 'string' },
              phone: { $phone: 1 },
              address: {
                type: 'object',
                properties: {
                  province: { type: 'string', minLength: 1 },
                  city: { type: 'string', minLength: 1 },
                  district: { type: 'string', minLength: 1 },
                  postcode: { type: 'string', minLength: 4 },
                  address: { type: 'string', minLength: 1 },
                }
              },
              // 实名信息，仅在专业版认证时需要
              realname_ext: {
                type: 'object',
                properties: {
                  idcard: { $idcard: 1 },              // 身份证编码
                }
              },
            }
          },
          // 团队信息
          team: {
            type: 'object',
            properties: {
              location: locationSchema.sanitization,
              type: { $enum: ENUMS.TEAM_TYPE },
              scale: { $enum: [1, 10, 50, 100] },
              description: { type: 'string', minLength: 3 },
            }
          },
        }
      },
    },
  },

  auth_ent: {
    sanitization: {
      info: {
        type: 'object',
        properties: {
          contact: {
            type: 'object',
            properties: {
              realname: { type: 'string' },
              gender: { type: 'string' },               // Enum:F,M
              position: { type: 'string' },
              phone: { type: 'string' },
            }
          },
          // 企业信息
          enterprise: {
            type: 'object',
            properties: {
              location: locationSchema.sanitization,
              industry: { type: 'string' },
              scale: { type: 'integer' },
              description: { type: 'string' },
            }
          },
        }
      },
    },
    validation: {
      info: {
        type: 'object',
        properties: {
          contact: {
            type: 'object',
            properties: {
              realname: { type: 'string', minLength: 2 },
              gender: { type: 'string', $enum: ENUMS.GENDER },
              position: { type: 'string' },
              phone: { $phone: 1 },
            }
          },
          // 企业信息
          enterprise: {
            type: 'object',
            properties: {
              location: locationSchema.sanitization,
              industry: { type: 'string', minLength: 2 },
              scale: { $enum: [1, 10, 50, 100] },
              description: { type: 'string', minLength: 3 },
            }
          },
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
