import { ENUMS } from 'lib/constants';

export let infoSanitization = {
  name: { type: 'string' },
  description: { type: 'string' },
  birthdate: { type: 'date' },
  sex: { type: 'string' },
  address: {
    type: 'object',
    properties: {
      country: { type: 'string' },
      province: { type: 'string' },
      city: { type: 'string' },
      address: { type: 'string' },
    }
  },
};

export let infoValidation = {
  name: { type: 'string', minLength: 2, maxLength: 50 },
  description: { type: 'string', maxLength: 500 },
  birthdate: { type: 'date' },
  sex: { $enum: ENUMS.SEX },
  address: {
    type: 'object',
    properties: {
      country: { type: 'string' },
      province: { type: 'string' },
      city: { type: 'string' },
      address: { type: 'string' },
    }
  },
};

export let settingsSanitization = {
  locale: { type: 'string', optional: true },
  timezone: { type: 'string', optional: true },
  current_company: { $ObjectId: true, optional: true },
};

export let settingsValidation = {
  locale: { type: 'string', optional: true },
  timezone: { $timezone: true, optional: true },
  current_company: { $ObjectId: true, optional: true },
};

export let optionsSanitization = {
  notice_request: { type: 'boolean', optional: true },
  notice_project: { type: 'boolean', optional: true },
};

export let optionsValidation = {
  notice_request: { type: 'boolean', optional: true },
  notice_project: { type: 'boolean', optional: true },
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
