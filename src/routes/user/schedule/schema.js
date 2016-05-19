export let sanitization = {
	title: { type: 'string' },
  description: { type: 'string' },
  date_from: { type: 'date' },
  date_end: { type: 'date' },
  repeat: {
		type: 'object',
		properties: {
			frequency: { type: 'string' },
	    at: { type: 'string' },
		}
  },
  remind: { type: 'string' },
  members: {
		type: 'array',
		items: {
			$objectId: 1
		}
	},
  share: {
		type: 'array',
		items: {
			type: 'object',
			properties: {
				type: { type: 'string' },
		    target: { $objectId: 1 },
			}
		}
	},
};

export let validation = {
	title: { type: 'string' },
  description: { type: 'string' },
  date_from: { type: 'date' },
  date_end: { type: 'date' },
  repeat: {
		type: 'object',
		properties: {
			frequency: { $enum: ['day', 'week', 'month', 'year'] },
	    at: { type: 'string' },
		}
  },
  remind: { $num: ['never', 'hour', 'day', 'week'] },
  members: {
		type: 'array',
		items: {
			$objectId: 1
		}
	},
  share: {
		type: 'array',
		items: {
			type: 'object',
			properties: {
				type: { $enum: ['company', 'department', 'project', 'task'] },
		    target: { $objectId: 1 },
			}
		}
	},
};
