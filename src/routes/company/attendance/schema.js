import { ENUMS } from 'lib/constants';

export let settingSanitization = {
  is_open: { type: 'boolean' },
  time_start: { type: 'string' },
  time_end: { type: 'string' },
  ahead_time: { type: 'string', optional: true },
  auditor: { $objectId: 1 },
  workday: {
    type: 'array',
    items: { type: 'int' },
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
  auditor: { $objectId: 1 },
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
  yaer: { type: 'int' },
  month: { type: 'int' },
  data: {
    type: 'object',
    properties: {
      member: { $objectId: 1 },
      normal: { type: 'int' },
      late: { type: 'int' },
      leave_early: { type: 'int' },
      absent: { type: 'int' },
      patch: { type: 'int' },
      business_trip: { type: 'int' },
      paid_vacation: { type: 'int' },
      nopaid_vacation: { type: 'int' },
      extra_work: { type: 'int' },
      workday_all: { type: 'int' },
      workday_real: { type: 'int' },
    }
  }
};

export let recordValidation = {
  yaer: { type: 'int' },
  month: { type: 'int' },
  data: {
    type: 'object',
    properties: {
      member: { $objectId: 1 },
      normal: { type: 'int' },
      late: { type: 'int' },
      leave_early: { type: 'int' },
      absent: { type: 'int' },
      patch: { type: 'int' },
      business_trip: { type: 'int' },
      paid_vacation: { type: 'int' },
      nopaid_vacation: { type: 'int' },
      extra_work: { type: 'int' },
      workday_all: { type: 'int' },
      workday_real: { type: 'int' },
    }
  }
};
