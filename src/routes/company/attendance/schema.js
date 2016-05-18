export let sanitization = {
	type: { type: 'string' },
};

export let validation = {
	type: { $enum: ['sign_in', 'sign_out'] },
};
