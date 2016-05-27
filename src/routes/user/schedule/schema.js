export let sanitization = {
	title: { type: 'string' },
  description: { type: 'string' },
  time_start: { type: 'date' },
  time_end: { type: 'date' },
	is_full_day: { type: 'boolean' },
  repeat_end: { type: 'date', optional: true },
  repeat: {
		type: 'object',
		properties: {
			type: { type: 'string' },
	    info: { type: 'array', optional: true },
		}
  },
  remind: {
		type: 'object',
		properties: {
			type: { type: 'string' },
	    num: { type: 'int' },
		}
  }
};

export let validation = {
	title: { type: 'string' },
  description: { type: 'string' },
  time_start: { type: 'date' },
  time_end: { type: 'date' },
	is_full_day: { type: 'boolean' },
  repeat_end: { type: 'date', optional: true },
  repeat: {
		type: 'object',
		properties: {
			type: { type: 'string' },
	    info: { type: 'array', optional: true },
		}
  },
  remind: {
		type: 'object',
		properties: {
			type: { type: 'string' },
	    num: { type: 'int' },
		}
  }
};
