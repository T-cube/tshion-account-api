import C, { ENUMS } from 'lib/constants';

export let sanitization = {
  name: { type: 'string' },
  description: { type: 'string' },
  scope: {
		type: 'array',
		properties: { $objectId: 1 }
	},
  status: { type: 'string' },
  steps: {
		type: 'array',
		items: {
			type: 'object',
			properties: {
		    _id: { $objectId: 1 },
		    approver: { $objectId: 1 },
		    approver_type: { type: 'string' },
		    copy_to: { $objectId: 1 },
		    copy_to_type: { type: 'string' }
		  }
		}
	},
  forms: {
		type: 'array',
		items: {
			type: 'object',
			properties: {
		    _id: { $objectId: 1 },
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
		properties: { $objectId: 1 }
	},
	steps: {
		type: 'array',
		items: {
			type: 'object',
			properties: {
				_id: { $objectId: 1 },
				approver: { $objectId: 1 },
				approver_type: { $enum: ENUMS.APPROVER_TYPE },
				copy_to: { $objectId: 1 },
				copy_to_type: { $enum: ENUMS.APPROVER_TYPE },
			}
		}
	},
	forms: {
		type: 'array',
		items: {
			type: 'object',
			properties: {
				_id: { $objectId: 1 },
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

export let userSanitization = {
  apply_item: { $objectId: 1 },
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

export let userValidation = {
  apply_item: { $objectId: 1 },
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
  status: { $enum: [C.USER_APPROVAL_STATUS.APPROVED, C.USER_APPROVAL_STATUS.REJECTED] },
  log: { type: 'string' },
}
