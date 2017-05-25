import C, { ENUMS } from 'lib/constants';
import { buildValidator } from 'lib/inspector';

const schema = {
  appRequest: {
    sanitization: {
      app_id: { $objectId: 1 },
      company_id: { $objectId: 1 },
      user_id: { $objectId: 1 },
      target: { type: 'string' }
    },
    validation: {
      app_id: { $objectId: 1 },
      company_id: { $objectId: 1 },
      user_id: { $objectId: 1 },
      target: { type: 'string' }
    },
  },
};

export const validate = buildValidator(schema);
