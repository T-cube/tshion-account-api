import C, { ENUMS } from 'lib/constants';
import { buildValidator } from 'lib/inspector';

const schema = {
  discussion: {
    sanitization: {
      title: { type: 'string' },
      content: { type: 'string' },
    },
    validation: {
      title: { type: 'string', minLength: 3, maxLength: 100 },
      content: { type: 'string' },
    },
  },
  comment: {
    sanitization: {
      to: { $objectId: 1, optional: true },
      content: { type: 'string' },
    },
    validation: {
      to: { $objectId: 1, optional: true },
      content: { type: 'string', minLength: 2, maxLength: 1000 },
    },
  },
  follow: {
    sanitization: {
      _id: { $objectId: 1 },
    },
    validation: {
      _id: { $objectId: 1 },
    },
  },
};

export const validate = buildValidator(schema);
