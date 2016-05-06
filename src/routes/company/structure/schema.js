export let structureSanitization = {
	name: { type: 'string' },
	description: { type: 'string' }
};

export let structureValidation = {
	name: { type: 'string' },
	description: { type: 'string' }
};

export let memberSanitization = {
	_id: { $objectId: 1 },
	position: { $objectId: 1 }
};

export let memberValidation = {
	_id: { $objectId: 1 },
	position: { $objectId: 1 }
};
