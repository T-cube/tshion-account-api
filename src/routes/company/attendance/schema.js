import { ENUMS } from 'lib/constants';
import { buildValidator } from 'lib/inspector';

export let settingSanitization = {
  is_open: { type: 'boolean' },
  time_start: { type: 'string' },
  time_end: { type: 'string' },
  ahead_time: { type: 'string', optional: true },
  auditor: { $objectId: 1, optional: true },
  workday: {
    type: 'array',
    items: { type: 'integer' },
  },
  location: {
    type: 'object',
    optional: true,
    properties: {
      latitude: { type: 'number' },
      longitude: { type: 'number' },
      address: { type: 'string', optional: true },
    }
  },
  max_distance: { type: 'number', gt: 0 },
  white_list: {
    type: 'array',
    optional: true,
    items: { $objectId: 1 }
  },
  workday_special: {
    type: 'array',
    optional: true,
    items: {
      type: 'object',
      properties: {
        date: { type: 'date' },
        title: { type: 'string' },
      }
    }
  },
  holiday: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        date: { type: 'date' },
        title: { type: 'string' },
      }
    }
  },
  approval_template: { $objectId: 1, optional: true },
};

export let settingValidation = {
  is_open: { type: 'boolean' },
  time_start: { type: 'string', pattern: /^(([1-9])|([1|0]\d)|(2[0-3])):[0-6]?\d$/ },
  time_end: { type: 'string', pattern: /^(([1-9])|([0|1]\d)|(2[0-3])):[0-6]?\d$/ },
  ahead_time: { type: 'string', optional: true },
  auditor: { $objectId: 1, optional: true },
  workday: {
    type: 'array',
    items: {
      $enum: [0, 1, 2, 3, 4, 5, 6]
    },
    uniqueness: true,
    maxLength: 7,
  },
  location: {
    type: 'object',
    properties: {
      latitude: { type: 'number', gte: -90, lte: 90 },
      longitude: { type: 'number', gte: -180, lte: 180 },
      address: { type: 'string', optional: true, maxLength: 500 },
    }
  },
  max_distance: { type: 'number', gte: 50 },
  white_list: {
    type: 'array',
    optional: true,
    items: { $objectId: 1 }
  },
  workday_special: {
    type: 'array',
    optional: true,
    items: {
      type: 'object',
      properties: {
        date: { type: 'date' },
        title: { type: 'string', maxLength: 200 },
      }
    }
  },
  holiday: {
    type: 'array',
    optional: true,
    items: {
      type: 'object',
      properties: {
        date: { type: 'date' },
        title: { type: 'string', maxLength: 200 },
      }
    }
  },
  approval_template: { $objectId: 1, optional: true },
};

export let signSanitization = {
  type: { type: 'string' },
  location: {
    type: 'object',
    optional: true,
    properties: {
      latitude: { type: 'number' },
      longitude: { type: 'number' },
      accuracy: { type: 'number' },
    }
  }
};

export let signValidation = {
  type: { $enum: ENUMS.ATTENDANCE_SIGN_TYPE },
  location: {
    type: 'object',
    optional: true,
    properties: {
      latitude: { type: 'number', gte: -90, lte: 90 },
      longitude: { type: 'number', gte: -180, lte: 180 },
      accuracy: { type: 'number', gte: 0 },
    }
  }
};

export let auditSanitization = {
  date: { type: 'date' },
  data: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        date: { type: 'date' },
      }
    }
  },
  reason: { type: 'string', optional: true },
};

export let auditValidation = {
  date: { type: 'date' },
  data: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        type: { $enum: ENUMS.ATTENDANCE_SIGN_TYPE },
        date: { type: 'date' },
      }
    }
  },
  reason: { type: 'string', optional: true },
};

export let auditCheckSanitization = {
  is_agreed: { type: 'boolean' },
  audit_message: { type: 'string', optional: true },
};

export let auditCheckValidation = {
  is_agreed: { type: 'boolean' },
  audit_message: { type: 'string', optional: true },
};

export let recordSanitization = {
  yaer: { type: 'integer' },
  month: { type: 'integer' },
  members: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        member: { $objectId: 1 },
        normal: { type: 'integer' },
        late: { type: 'integer' },
        leave_early: { type: 'integer' },
        absent: { type: 'integer' },
        patch: { type: 'integer' },
        business_trip: { type: 'integer' },
        paid_vacation: { type: 'integer' },
        nopaid_vacation: { type: 'integer' },
        extra_work: { type: 'integer' },
        workday_all: { type: 'integer' },
        workday_real: { type: 'integer' },
      }
    }
  }
};

export let recordValidation = {
  yaer: { type: 'integer' },
  month: { type: 'integer' },
  members: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        member: { $objectId: 1 },
        normal: { type: 'integer' },
        late: { type: 'integer' },
        leave_early: { type: 'integer' },
        absent: { type: 'integer' },
        patch: { type: 'integer' },
        business_trip: { type: 'integer' },
        paid_vacation: { type: 'integer' },
        nopaid_vacation: { type: 'integer' },
        extra_work: { type: 'integer' },
        workday_all: { type: 'integer' },
        workday_real: { type: 'integer' },
      }
    }
  }
};

const schema = {
  pageInfo: {
    sanitization: {
      page: { type: 'integer', gte: 1 },
      pagesize: { type: 'integer', gte: 1 },
      department_id: { $objectId: 1, optional: true }
    },
    validation: {
      page: { type: 'integer'},
      pagesize: { type: 'integer'},
      department_id: { $objectId: 1, optional: true }
    },
  },
  outdoorSign: {
    sanitization: {
      location: {
        type: 'object',
        properties: {
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          address: { type: 'string' },
        }
      },
      content: { type: 'string', rules: ['trim'] },
      pic_record: {
        type: 'array',
        items: { $objectId: 1 }
      }
    },
    validation: {
      location: {
        type: 'object',
        properties: {
          latitude: { type: 'number', gte: -90, lte: 90 },
          longitude: { type: 'number', gte: -180, lte: 180 },
          address: { type: 'string', maxLength: 500 },
        }
      },
      content: { type: 'string', minLength: 1 },
      pic_record: {
        type: 'array',
        items: { $objectId: 1 }
      }
    }
  },
  outdoorQuery: {
    sanitization: {
      date_start: { $date: 1 },
      date_end: { $date: 1 },
      user_id: { $objectId: 1, optional: true }
    },
    validation: {
      date_start: { $date: 1 },
      date_end: { $date: 1 },
      user_id: { $objectId: 1, optional: true }
    }
  },
  outdoorList: {
    sanitization: {
      type: { type: 'string', optional: true },
      last_id: { $objectId: 1, optional: true },
    },
    validation: {
      type: { $enum: ['mine', 'all'], optional:true },
      last_id: { $objectId: 1, optional: true },
    }
  }
};

export const validate = buildValidator(schema);
