import { ENUMS } from 'lib/constants';

export let sanitization = {
  parent_id: { $objectId: 1, optional: true },
  status: { type: 'string' },                //任务状态
  title: { type: 'string' },              // 任务标题
  description: { type: 'string', optional: true },        // 任务详情
  assignee: { $objectId: 1, optional: true },             // 执行人
  date_start: { type: 'date', optional: true },// 开始时间（optional）
  date_due: { type: 'date', optional: true },  // 截止时间（optional）
  priority: { type: 'int', optional: true },                // 优先级别
  tags: {
    type: 'array',
    optional: true,
    items: {
      $objectId: 1
    }
  },
};

export let validation = {
  parent_id: { $objectId: 1, optional: true },
  status: { $enum: ENUMS.TASK_STATUS },
  title: { type: 'string' },
  description: { type: 'string', optional: true },
  assignee: { $objectId: 1, optional: true },
  date_start: { type: 'date', optional: true },
  date_due: { type: 'date', optional: true },
  priority: { $enum: ENUMS.TASK_PRIORITY, optional: true },
  tags: {
    type: 'array',
    optional: true,
    items: {
      $objectId: 1
    }
  },
};

export let commentSanitization = {
  content: { type: 'string' }
};

export let commentValidation = {
  content: { type: 'string', minLength: 3, maxLength: 500 }
};
