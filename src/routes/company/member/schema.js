export let memberCreateSanitization = {
	title: { type: 'string' }
};

export let memberCreateValidation = {
	title: { type: 'string' }
};

export let memberUpdateSanitization = {
	title: { type: 'string' },
	is_manager: { type: 'boolean' }
};

export let memberUpdateValidation = {
	title: { type: 'string' },
	is_manager: { type: 'boolean' }
};
