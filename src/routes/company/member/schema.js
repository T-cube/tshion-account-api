import { ENUMS } from 'lib/constants';
console.log(ENUMS);

export let sanitization = {
	_id: { $objectId: 1 },
	name: { type: 'string' },
	mobile: { type: 'string' },
	birthdate: { type: 'date' },
	joindate: { type: 'date' },
	email: { type: 'string', rules: ['trim', 'lower'] },
	address: { type: 'string' },
	sex: { type: 'string' },
};

export let validation = {
	_id: { $objectId: 1 },
	name: { type: 'string', maxLength: 50 },
	mobile: { type: 'string' },
	birthdate: { type: 'date' },
	joindate: { type: 'date' },
	email: { type: 'string', pattern: 'email' },
	address: { type: 'string' },
	sex: { $enum: ENUMS.SEX },
};
