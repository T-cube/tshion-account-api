
import { buildValidator } from 'lib/inspector';
import { ENUMS } from 'lib/constants';

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

  plan: {
    sanitization: {
      company_id: { $bjectId: 1 },             // 团队
      user_id: { $bjectId: 1 },                // 申请用户
      plan: { type: 'string' },                   // 升级方案
      status: { type: 'string' },                // 状态
      date_start: { type: 'date' },     // 申请日期
      date_end: { type: 'date' },
    },
    validation: {
      company_id: { $bjectId: 1 },
      user_id: { $bjectId: 1 },
      plan: { $enum: ENUMS.PLAN.TEAMPLAN },
      status: { $enum: ENUMS.PLAN.PLAN_STATUS },
      date_start: { type: 'date' },
      date_end: { type: 'date' },
    },
  },

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
              type: { type: 'string' }, //String[Enum:none-profit,workshop,startup],
              scale: { type: 'int' }, //Number[Enum:5,10,50,100],
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
              type: { type: 'string' }, //String[Enum:none-profit,workshop,startup],
              scale: { type: 'int' }, //Number[Enum:5,10,50,100],
              description: { type: 'string' },
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
              industry: { type: 'string' },               // 行业类型
              scale: { type: 'int' }, // Number[Enum:5,10,50,100],
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
              industry: { type: 'string' },               // 行业类型
              scale: { type: 'int' }, // Number[Enum:5,10,50,100],
              description: { type: 'string' },
            }
          },
        }
      },
    },
  },

  coupon: {
    sanitization: {
      coupon_no: { type: 'string' },                  // 优惠券编号
      products: {
        type: 'array',
        items: {
          $objectId: 1
        }
      },
      title: { type: 'string' },
      description: { type: 'string' },
      criteria: {
        quantity: { type: 'int' },                 // 最低数量
        total_fee: { type: 'int' },              // 最低金额
      },
      discount: {
        type: { type: 'string' },               // 优惠类型：number,rate,amount
        number: { type: 'int' },                   // 赠送数量
        rate: { type: 'number' },                     // 折扣（0~0.99）
        amount: { type: 'int' },                 // 优惠金额
      },
      period: {
        date_start: { type: 'date' },
        data_end: { type: 'date' },
      },
      stock_total: { type: ['int', null] },      // 库存数量，无数量限制为 null
      stock_current: { type: ['int', null] },    // 剩余数量，无数量限制为 null
      date_create: { type: 'date' },
      date_update: { type: 'date' },
    },
    validation: {},
  },

  charge_discount: {
    sanitization: {
      discount_no: { type: 'string' },
      title: { type: 'string' },
      amount: { type: 'int' },
      extra_amount: { type: 'int' },
      date_create: { type: 'date' },
      date_update: { type: 'date' },
    },
    validation: {},
  }

};

export const validate = buildValidator(schema);
