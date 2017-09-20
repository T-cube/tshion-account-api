import C, { ENUMS } from 'lib/constants';

const fieldValidation = {
  type: 'object',
  strict: false,
  properties: {
    type: { type: 'string' },
    label: {
      type: 'string',
      minLength: 2,
      maxLength: 50,
      error: '请输入2~50个字符',
    },
    required: { type: 'boolean', optional: true },
    defaultValue: { type: ['boolean', 'array', 'string', 'null', 'number'], optional: true },
    options: {
      type: ['array', 'null'],
      optional: true,
      minLength: 2,
      maxLength: 10,
      items: {
        label: { type: 'string', minLength: 1 },
        value: { type: 'string', minLength: 1 },
      },
      error: '请至少添加2个项目，最多10个',
    },
    optionsKeyValueSame: { type: 'boolean', optional: true },
  }
};

export let autoSanitization = {
  name: { type: 'string' },
  description: { type: 'string', optional: true },
  forms: {
    type: 'array',
    optional: true,
    items: fieldValidation
  },
  copy_to: {
    type: 'array',
    items: {
      type: 'object',
      optional: true,
      strict: true,
      properties: {
        _id: { $objectId: 1 },
        type: { type: 'string' }
      }
    }
  },
  auto: { type: 'boolean' },
};

export let autoValidation = {
  name: { type: 'string' },
  description: { type: 'string', optional: true },
  forms: {
    type: 'array',
    optional: true,
    items: fieldValidation
  },
  copy_to: {
    type: 'array',
    optional: true,
    items: {
      type: 'object',
      optional: true,
      properties: {
        _id: { $objectId: 1 },
        type: { $enum: ENUMS.APPROVER_TYPE },
      }
    }
  },
  auto: { type: 'boolean' },
};

export let sanitization = {
  name: { type: 'string' },
  description: { type: 'string', optional: true },
  scope: {
    type: 'array',
    items: { $objectId: 1 }
  },
  steps: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        approver: {
          type: 'object',
          strict: true,
          properties: {
            _id: { $objectId: 1 },
            type: { type: 'string' }
          }
        },
        copy_to: {
          type: 'array',
          items: {
            type: 'object',
            optional: true,
            strict: true,
            properties: {
              _id: { $objectId: 1 },
              type: { type: 'string' }
            }
          }
        }
      }
    }
  },
  forms: {
    type: 'array',
    optional: true,
    items: fieldValidation
  },
};

export let validation = {
  name: { type: 'string' },
  description: { type: 'string', optional: true },
  scope: {
    type: 'array',
    items: { $objectId: 1 }
  },
  steps: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        approver: {
          type: 'object',
          properties: {
            _id: { $objectId: 1 },
            type: { $enum: ENUMS.APPROVER_TYPE },
          }
        },
        copy_to: {
          type: 'array',
          optional: true,
          items: {
            type: 'object',
            optional: true,
            properties: {
              _id: { $objectId: 1 },
              type: { $enum: ENUMS.APPROVER_TYPE },
            }
          }
        }
      }
    }
  },
  forms: {
    type: 'array',
    optional: true,
    items: fieldValidation
  },
};

export let statusSanitization = {
  status: { type: 'string' }
};

export let statusValidation = {
  status: { $enum: ENUMS.APPROVAL_STATUS }
};

export let itemSanitization = {
  template: { $objectId: 1 },
  department: { $objectId: 1, optional: true },
  content: { type: 'string' },
  forms: {
    type: 'array',
    optional: true,
    items: {
      type: 'object',
      properties: {
        _id: { $objectId: 1 },
        value: { type: 'string' }
      }
    }
  },
  target: {
    type: 'object',
    optional: true,
    properties: {
      _id: { $objectId: 1 },
      type: { type: 'string' }
    }
  },
};

export let itemValidation = {
  template: { $objectId: 1 },
  department: { $objectId: 1, optional: true },
  content: { type: 'string' },
  forms: {
    type: 'array',
    optional: true,
    items: {
      type: 'object',
      properties: {
        _id: { $objectId: 1 },
        value: { type: 'string' }
      }
    }
  },
  target: {
    type: 'object',
    optional: true,
    properties: {
      _id: { $objectId: 1 },
      type: { $enum: ENUMS.APPROVAL_TARGET }
    }
  },
};

export let stepSanitization = {
  _id: { $objectId: 1 },
  status: { type: 'string' },
  log: { type: 'string' },
};

export let stepValidation = {
  _id: { $objectId: 1 },
  status: { $enum: [C.APPROVAL_ITEM_STATUS.APPROVED, C.APPROVAL_ITEM_STATUS.REJECTED] },
  log: { type: 'string' },
};

export let revokeSanitization = {
  status: { type: 'string' },
  revoke_log: { type: 'string', optional: true }
};

export let revokeValidation = {
  status: { $enum: [C.APPROVAL_ITEM_STATUS.REVOKED] },
  revoke_log: { type: 'string', optional: true }
};
