import C, { ENUMS } from 'lib/constants';
import { buildValidator } from 'lib/inspector';

const schema = {
  project: {
    sanitization: {
      name: { type: 'string' },
      description: { type: 'string', optional: true }
    },
    validation: {
      name: { type: 'string', minLength: 1, maxLength: 100 },
      description: { type: 'string', maxLength: 1000, optional: true },
    },
  },
  member: {
    sanitization: {
      _id: { $objectId: 1 },
      title: { type: 'string', optional: true }
    },
    validation: {
      _id: { $objectId: 1 },
      title: { type: 'string', optional: true }
    },
  },
  tag: {
    sanitization: {
      name: { type: 'string' },
      color: { type: 'string' },
    },
    validation: {
      name: { type: 'string', minLength: 1 },
      color: { type: 'string' },
    },
  },
  file: {
    sanitization: {
      title: {  type: 'string' },
      description: {  type: 'string', optional: true },
      content: {  type: 'string', optional: true },
    },
    validation: {
      title: {  type: 'string', minLength: 1 },
      description: {  type: 'string', optional: true },
      content: {  type: 'string', optional: true },
    },
  },
  upload: {
    sanitization: {
      name: { type: 'string' },
    },
    validation: {
      name: { $enum: C.UPLOAD_TYPE },
    }
  }
};

export const validate = buildValidator(schema);
