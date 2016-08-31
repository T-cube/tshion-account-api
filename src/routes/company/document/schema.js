import C, { ENUMS } from 'lib/constants';
import { buildValidator } from 'lib/inspector';

const schema = {
  dir: {
    sanitization: {
      name: { type: 'string' },
      parent_dir: { $objectId: 1 },
    },
    validation: {
      name: { type: 'string', minLength: 1, maxLength: 200 },
      parent_dir: { $objectId: 1 },
    },
  },
  file: {
    sanitization: {
      name: { type: 'string' },
      description: { type: 'string', optional: true },
      content: { type: 'string', optional: true },
    },
    validation: {
      name: { type: 'string', minLength: 1 },
      description: { type: 'string', optional: true },
      content: { type: 'string', optional: true },
    },
  },
  del: {
    sanitization: {
      files: {
        type: 'array',
        optional: true,
        items: {
          $objectId: 1
        }
      },
      dirs: {
        type: 'array',
        optional: true,
        items: {
          $objectId: 1
        }
      },
    },
    validation: {
      files: {
        type: 'array',
        optional: true,
        items: {
          $objectId: 1
        }
      },
      dirs: {
        type: 'array',
        optional: true,
        items: {
          $objectId: 1
        }
      },
    },
  },
  move: {
    sanitization: {
      files: {
        type: 'array',
        optional: true,
        items: {
          $objectId: 1
        }
      },
      dirs: {
        type: 'array',
        optional: true,
        items: {
          $objectId: 1
        }
      },
      target_dir: { $objectId: 1 },
    },
    validation: {
      files: {
        type: 'array',
        optional: true,
        items: {
          $objectId: 1
        }
      },
      dirs: {
        type: 'array',
        optional: true,
        items: {
          $objectId: 1
        }
      },
      target_dir: { $objectId: 1 },
    },
  }
};

export const validate = buildValidator(schema);
