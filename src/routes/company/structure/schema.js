export let nodeSanitization = {
	name: { type: 'string' },
	description: { type: 'string', optional: true },
	admin: { $objectId: 1, optional: true },
	positions: { type: 'array', optional: true, items: { type: 'string', optional: true } },
};

export let nodeValidation = {
	name: { type: 'string' },
	description: { type: 'string', optional: true },
	admin: { $objectId: 1, optional: true },
	positions: { type: 'array', optional: true, items: { type: 'string', optional: true } },
};

export let memberSanitization = {
	data: {
		type: 'array',
		items: {
			_id: { $objectId: 1 },
			position: { $objectId: 1, optional: true }
		}
	}
};

export let memberValidation = {
	data: {
		type: 'array',
		items: {
			_id: { $objectId: 1 },
			position: { $objectId: 1, optional: true }
		}
	}
};
