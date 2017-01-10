import { ENUMS } from 'lib/constants';
import { buildValidator } from 'lib/inspector';
import NotificationSetting from 'models/notification-setting';

const notificationSetting = new NotificationSetting();
const notificationTypes = notificationSetting.getSettingTypes();
const notificationMethods = notificationSetting.getSettingMethods();

const schema = {
  info: {
    sanitization: {
      name: { type: 'string' },
      description: { type: 'string', optional: true },
      birthdate: { type: 'date', optional: true },
      sex: { type: 'string', optional: true },
      address: {
        type: 'object',
        optional: true,
        properties: {
          country: { type: 'string' },
          province: { type: 'string' },
          city: { type: 'string' },
          district: { type: 'string', optional: true },
          address: { type: 'string', optional: true },
        },
      },
    },
    validation: {
      name: { type: 'string', minLength: 2, maxLength: 50 },
      description: { type: 'string', maxLength: 500, optional: true },
      birthdate: { type: 'date', optional: true },
      sex: { $enum: ENUMS.SEX, optional: true },
      address: {
        type: 'object',
        optional: true,
        properties: {
          country: { type: 'string' },
          province: { type: 'string' },
          city: { type: 'string' },
          district: { type: 'string', optional: true },
          address: { type: 'string', optional: true },
        },
      },
    },
  },
  settings: {
    sanitization: {
      locale: { type: 'string', optional: true },
      timezone: { type: 'string', optional: true },
      current_company: { $ObjectId: true, optional: true },
    },
    validation: {
      locale: { type: 'string', optional: true },
      timezone: { $timezone: true, optional: true },
      current_company: { $ObjectId: true, optional: true },
    },
  },
  'options-notification': {
    sanitization: {
      type: { type: 'string' },
      method: { type: 'string' },
      on: { type: 'boolean' },
    },
    validation: {
      type: { $enum: notificationTypes },
      method: { $enum: notificationMethods },
      on: { type: 'boolean' },
    },
  },
  preference: {
    sanitization: {
      'explore.sort_by': { type: 'string', optional: true },
      'explore.view_type': { type: 'string', optional: true },
      'weather.areaid': { type: 'string', optional: true },
      'panel.announcement': { type: 'boolean', optional: true },
      'panel.schedule': { type: 'boolean', optional: true },
      'panel.weather': { type: 'boolean', optional: true },
      'panel.locked': { type: 'boolean', optional: true },
      'panel.open': { type: 'boolean', optional: true },
    },
    validation: {
      'explore.sort_by': { type: 'string', optional: true },
      'explore.view_type': { type: 'string', optional: true },
      'weather.areaid': { type: 'string', optional: true },
      'panel.announcement': { type: 'boolean', optional: true },
      'panel.schedule': { type: 'boolean', optional: true },
      'panel.weather': { type: 'boolean', optional: true },
      'panel.locked': { type: 'boolean', optional: true },
      'panel.open': { type: 'boolean', optional: true },
    }
  },
  preference_reset: {
    sanitization: {
      type: { type: 'string' },
    },
    validation: {
      type: { $enum: ['panel'] },
    },
  }
};

export const validate = buildValidator(schema);
