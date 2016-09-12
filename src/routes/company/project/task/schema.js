import C, { ENUMS } from 'lib/constants';
import { buildValidator } from 'lib/inspector';

let schema = {
  subtask: {
    sanitization: {
      title: { type: 'string' },
      status: { type: 'string' },
    },
    validation: {
      title: {
        type: 'string',
        minLength: 3,
        maxLength: 200
      },
      status: { $enum: [C.TASK_STATUS.PROCESSING, C.TASK_STATUS.COMPLETED] },
    },
  }
};

export let sanitization = {
  parent_id: { $objectId: 1, optional: true },
  status: { type: 'string' },                //任务状态
  title: { type: 'string' },              // 任务标题
  description: { type: 'string', optional: true },        // 任务详情
  assignee: { $objectId: 1, optional: true },             // 执行人
  date_start: { $date: 1, optional: true },// 开始时间（optional）
  date_due: { $date: 1, optional: true },  // 截止时间（optional）
  priority: { type: 'int', optional: true },                // 优先级别
  tags: {
    type: 'array',
    optional: true,
    items: {
      $objectId: 1
    }
  },
  subtask: {                                          // 子任务
    type: 'array',
    optional: true,
    items: schema.subtask.sanitization.title
  },
  loop: {                                             // 是否为循环任务
    type: 'string',
    optional: true,
  },
  checker: {
    $objectId: 1,
    optional: true,
  },
};

export let validation = {
  parent_id: { $objectId: 1, optional: true },
  status: { $enum: ENUMS.TASK_STATUS },
  title: { type: 'string' },
  description: { type: 'string', optional: true },
  assignee: { $objectId: 1, optional: true },
  date_start: { type: ['date', 'null'], optional: true },
  date_due: { type: ['date', 'null'], optional: true },
  priority: { $enum: ENUMS.TASK_PRIORITY, optional: true },
  tags: {
    type: 'array',
    optional: true,
    items: {
      $objectId: 1
    }
  },
  subtask: {
    type: 'array',
    optional: true,
    items: schema.subtask.validation.title
  },
  loop: {
    $enum: [null, 'day', 'weekday', 'month', 'year'],
    optional: true,
  },
  checker: {
    $objectId: 1,
    optional: true,
  },
};

export let commentSanitization = {
  content: { type: 'string' }
};

export let commentValidation = {
  content: { type: 'string', minLength: 3, maxLength: 500 }
};

export const validate = buildValidator(schema);
