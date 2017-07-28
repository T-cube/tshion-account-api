import C, { ENUMS } from 'lib/constants';

export let sanitization = {
  name: { type: 'string' },
  email: { type: 'string', rules: ['trim', 'lower'] },
  mobile: { type: 'string', def: '' },
  birthdate: { type: 'date', def: '' },
  joindate: { type: 'date', def: '' },
  address: { type: 'string', def: '' },
  sex: { type: 'string', def: C.SEX.MALE },
  type: { type: 'string', def: C.COMPANY_MEMBER_TYPE.NORMAL },
  ID: { type: 'number', def: '' },
};

export let validation = {
  name: { type: 'string', minLength: 2, maxLength: 50 },
  email: { type: 'string', $email: 1, optional: true },
  mobile: { type: 'string', $mobile: 1, optional: true },
  birthdate: { type: 'date', optional: true },
  joindate: { type: 'date', optional: true },
  address: { type: 'string', optional: true },
  sex: { $enum: ENUMS.SEX, optional: true },
  type: { $enum: ENUMS.COMPANY_MEMBER_TYPE },
  ID: { type: 'number', optional: true },
};
