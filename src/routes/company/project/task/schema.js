import _ from 'underscore';
import { ENUMS } from 'lib/constants';

export let sanitization = {
  parent_id: { $objectId: 1, optional: true },
  status: { type: 'string' },                //任务状态
  title: { type: 'string' },              // 任务标题
  description: { type: 'string' },        // 任务详情
  assignee: { $objectId: 1 },             // 执行人
  date_start: { type: 'date', optional: 1 },// 开始时间（optional）
  date_due: { type: 'date', optional: 1 },  // 截止时间（optional）
  priority: { type: 'int' },                // 优先级别
  tag: {
    type: 'array',
    items: { $objectId: 1 }
  },
}

export let validation = {
  parent_id: { $objectId: 1, optional: true },
  status: { $enum: ENUMS.TASK_STATUS },
  title: { type: 'string' },
  description: { type: 'string' },
  assignee: { $objectId: 1 },
  date_start: { type: 'date', optional: 1 },
  date_due: { type: 'date', optional: 1 },
  priority: { $enum: ENUMS.TASK_PRIORITY },
  tag: {
    type: 'array',
    items: { $objectId: 1 }
  },
}

export let commentSanitization = {
  content: { type: 'string' }
}

export let commentValidation = {
  content: { type: 'string', minLength: 3, maxLength: 500 }
}
