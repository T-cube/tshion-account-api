import C, { ENUMS } from 'lib/constants';

export let sanitization = {
  name: { type: 'string' },
  description: { type: 'string' },
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
            type: { type: 'string' }
          }
        },
		    copy_to: {
          type: 'array',
          items: {
            type: 'object',
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
		items: {
			type: 'object',
			properties: {
		    title: { type: 'string' },
		    form_type: { type: 'string' }
			}
		}
	}
};

export let validation = {
	name: { type: 'string' },
	description: { type: 'string' },
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
            type: { $enum: ENUMS.APPROVER_TYPE }
          }
        },
				copy_to: {
          type: 'array',
          items: {
            type: 'object',
      			properties: {
              _id: { $objectId: 1 },
              type: { $enum: ENUMS.APPROVER_TYPE }
            }
          }
        }
			}
		}
	},
	forms: {
		type: 'array',
		items: {
			type: 'object',
			properties: {
				title: { type: 'string' },
				form_type: { $enum: ENUMS.FORM_TYPE }
			}
		}
	}
};

export let statusSanitization = {
	status: { type: 'string' }
}

export let statusValidation = {
	status: { $enum: ENUMS.APPROVAL_STATUS }
}

export let itemSanitization = {
  template_id: { $objectId: 1 },
  department: { $objectId: 1 },
  content: { type: 'string' },
  files: {
    type: 'array',
    items: {
      type: 'string'
    }
  },
  forms: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        _id: { $objectId: 1 },
        value: { type: 'string' }
      }
    }
  }
}

export let itemValidation = {
  template_id: { $objectId: 1 },
  department: { $objectId: 1 },
  content: { type: 'string' },
  files: {
    type: 'array',
    items: {
      type: 'string'
    }
  },
  forms: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        _id: { $objectId: 1 },
        value: { type: 'string' }
      }
    }
  }
}

export let stepSanitization = {
  _id: { $objectId: 1 },
  status: { type: 'string' },
  log: { type: 'string' },
}

export let stepValidation = {
  _id: { $objectId: 1 },
  status: { $enum: [C.APPROVAL_ITEM_STATUS.APPROVED, C.APPROVAL_ITEM_STATUS.REJECTED] },
  log: { type: 'string' },
}
