export let settingSanitization = {
	is_open: { type: 'boolean' },
  time_start: { type: 'string' },
  time_end: { type: 'string' },
  ahead_time: { type: 'string' },
  workday: {
		type: 'array',
		items: { type: 'int' },
	},
  location: {
		type: 'array',
		items: { type: 'string' }
	},
  white_list: {
		type: 'array',
		optional: true,
		items: { $objectId: 1 }
	},
  workday_special: {
		type: 'array',
		optional: true,
		items: {
			type: 'object',
			properties: {
				date: { type: 'string' },
				title: { type: 'string' },
			}
		}
	},
  holiday: {
		type: 'array',
		optional: true,
		items: {
			type: 'object',
			properties: {
				date: { type: 'string' },
				title: { type: 'string' },
			}
		}
	},
};

export let settingValidation = {
	is_open: { type: 'boolean' },
  time_start: { type: 'string' },
  time_end: { type: 'string' },
  ahead_time: { type: 'string' },
  workday: {
		type: 'array',
		items: {
			$enum: [0, 1, 2, 3, 4, 5, 6]
		},
		uniqueness: true,
	},
  location: {
		type: 'array',
		items: { type: 'string' }
	},
  white_list: {
		type: 'array',
		optional: true,
		items: { $objectId: 1 }
	},
  workday_special: {
		type: 'array',
		optional: true,
		items: {
			type: 'object',
			properties: {
				date: { type: 'string' },
				title: { type: 'string' },
			}
		}
	},
  holiday: {
		type: 'array',
		optional: true,
		items: {
			type: 'object',
			properties: {
				date: { type: 'string' },
				title: { type: 'string' },
			}
		}
	},
};

export let signSanitization = {
	type: { type: 'string' },
};

export let signValidation = {
	type: { $enum: ['sign_in', 'sign_out'] },
};

export let auditSanitization = {
  date: { type: 'date' },
  type: { type: 'string' },
  reason: { type: 'string', optional: true },
};

export let auditValidation = {
  date: { type: 'date' },
  type: { $enum: ['sign_in', 'sign_out'] },
  reason: { type: 'string', optional: true },
};

export let auditCheckSanitization = {
  is_agreed: { type: 'boolean' },
  audit_message: { type: 'string', optional: true },
};

export let auditCheckValidation = {
	is_agreed: { type: 'boolean' },
  audit_message: { type: 'string', optional: true },
};
