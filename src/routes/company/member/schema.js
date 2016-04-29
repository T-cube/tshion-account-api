import C, { ENUMS } from 'lib/constants';

export let sanitization = {
	name: { type: 'string' },
	email: { type: 'string', rules: ['trim', 'lower'] },
	mobile: { type: 'string', def: '' },
	birthdate: { type: 'date', def: '' },
	joindate: { type: 'date', def: '2012-12-20' },
	address: { type: 'string', def: '' },
	sex: { type: 'string', def: C.SEX.MALE },
	type: { type: 'string', def: C.COMPANY_MEMBER_TYPE.NORMAL },
};

export let validation = {
	name: { type: 'string', minLength: 2, maxLength: 50 },
	email: { type: 'string', pattern: 'email' },
	mobile: { type: 'string', optional: true },
	birthdate: { type: 'date', optional: true },
	joindate: { type: 'date', optional: true },
	address: { type: 'string', optional: true },
	sex: { $enum: ENUMS.SEX, optional: true },
	type: { $enum: ENUMS.COMPANY_MEMBER_TYPE },
};
