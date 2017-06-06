import { buildValidator } from 'lib/inspector';

const schema = {
  appRequest: {
    sanitization: {
      app_id: { $objectId: 1 },
      company_id: { $objectId: 1 },
      note_id: { $objectId: 1, optional: true },
      notebook_id: { $objectId: 1, optional: true },
      tag_id: { $objectId: 1, optional: true },

    },
    validation: {
      app_id: { $objectId: 1 },
      company_id: { $objectId: 1 },
      note_id: { $objectId: 1, optional: true },
      notebook_id: { $objectId: 1, optional: true },
      tag_id: { $objectId: 1, optional: true },

    },
  },
};

export const validate = buildValidator(schema);
