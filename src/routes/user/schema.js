import { ENUMS } from 'lib/constants';

export let infoSanitization = {
  name: { type: 'string' },
  description: { type: 'string' },
  mobile: { type: 'string' },
  birthdate: { type: 'date' },
  address: {
    type: 'object',
    properties: {
      country: { type: 'string' },
      province: { type: 'string' },
      city: { type: 'string' },
      address: { type: 'string' },
    }
  },
  sex: { type: 'string' },
};

export let infoValidation = {
  name: { type: 'string', minLength: 1, maxLength: 50 },
  description: { type: 'string', maxLength: 500 },
  mobile: { $mobile: 1 },
  birthdate: { type: 'date' },
  address: {
    type: 'object',
    properties: {
      country: { type: 'string' },
      province: { type: 'string' },
      city: { type: 'string' },
      address: { type: 'string' },
    }
  },
  sex: { $enum: ENUMS.SEX },
};

export let avatarSanitization = {
  avatar: '',
  // crop_x: 'int',
  // crop_y: 'int',
  // crop_width: 'int',
  // crop_height: 'int',
};

export let avatarValidation = {
  avatar: '',
  // crop_x: 'int',
  // crop_y: 'int',
  // crop_width: 'int',
  // crop_height: 'int',
};
