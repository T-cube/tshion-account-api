import _ from 'underscore';
import path from 'path';

// application constants

let constants = {

  ACTIVITY_ACTION: {
    // 常规操作
    ADD: 'add',               // 添加
    REMOVE: 'remove',         // 移除
    CREATE: 'create',         // 创建
    UPDATE: 'update',         // 更新（字段）
    DELETE: 'delete',         // 删除
    QUIT: 'quit',             // 退出
    REPLY: 'reply',           // 回复
    RENAME: 'rename',         // 重命名
    COMMENT: 'comment',       // 评论
    DOWNLOAD: 'download',     // 下载
    // 成员
    JOIN: 'join',             // 加入
    EXIT: 'exit',             // 退出
    ADD_POSITION: 'add_position',             // 添加职位
    REMOVE_POSITION: 'remove_position',       // 移除职位
    SET_ADMIN: 'add_admin',             // 设为管理员
    REMOVE_ADMIN: 'remove_admin',       // 取消管理员
    // 管理操作
    TRANSFER: 'transfer',      // 转让
    // 邀请、审批
    ACCEPT: 'accept',         // 接受
    APPROVE: 'approve',       // 通过
    REJECT: 'reject',         // 拒绝
    REVOKE: 'revoke',         // 撤回
    SUBMIT: 'submit',         // 提交
    COPY: 'copy',             // 抄送
    CANCEL: 'cancel',         // 取消
    ENABLE_APPROVAL_TPL: 'enable_approval_tpl',         // 启用审批模板
    DISABLE_APPROVAL_TPL: 'disable_approval_tpl',         // 禁用审批模板
    // 任务
    COMPLETE: 'complete',     // 关注
    REOPEN: 'reopen',         // 取消关注
    // 关注
    FOLLOW: 'follow',         // 关注
    UNFOLLOW: 'unfollow',     // 取消关注
    ARCHIVED: 'archived',     // 归档
    UN_ARCHIVED: 'un_archived',     // 重启
    CHANGE_TASK_ASSIGNEE: 'change_task_assignee', // 修改项目的执行人
    // 文件操作
    UPLOAD: 'upload',         // 上传
    MOVE: 'move',             // 移动

    SYSTEM_SET: 'system.set', // 提醒
    SCHEDULE_REMIND: 'schedule.remind',      // 日程提醒
    ATTENDANCE_REMIND: 'attendance.remind',  // 考勤提醒

    SIGN_IN: 'sign.in',       // 签到
    SIGN_OUT: 'sign.out',     // 签到
    SIGN_AUDIT: 'sign.audit', // 补签

    RELEASE: 'release',   // 发布

    TASK_DAYLYREPORT: 'task_daylyreport',   // 任务日报
  },

  ACTIVITY_TYPE: {
    COMPANY: 'company',
    PROJECT: 'project',
    TASK: 'task',
    USER: 'user',
  },

  ANNOUNCEMENT_TYPE: {
    NOTICE: 'notice',
    NEWS: 'news',
  },

  APPROVAL_ITEM_STATUS: {
    PROCESSING: 'processing',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    REVOKED: 'revoked',
    TEMPLATE_CHNAGED: 'template.changed',
  },

  APPROVAL_STATUS: {
    NORMAL: 'normal',
    UNUSED: 'unused',
    DELETED: 'deleted',
    OLD_VERSION: 'old_version',
  },

  APPROVER_TYPE: {
    DEPARTMENT: 'department',
    MEMBER: 'member',
  },

  APPROVAL_TARGET: {
    ATTENDANCE_AUDIT: 'attendance.audit',
  },

  ATTENDANCE_SIGN_TYPE: {
    SIGN_IN: 'sign_in',
    SIGN_OUT: 'sign_out',
  },

  ATTENDANCE_AUDIT_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
  },

  COMPANY_MEMBER_STATUS: {
    BANNED: 'banned',
    PENDING: 'pending',
    NORMAL: 'normal',
    REJECTED: 'rejected',
  },

  COMPANY_MEMBER_TYPE: {
    NORMAL: 'normal',
    ADMIN: 'admin',
    OWNER: 'owner',
  },

  FORM_TYPE: {
    TEXT: 'text',
    TEXTAREA: 'textarea',
    DATE: 'date',
  },

  LEVEL_ERROR: {
    OVER_STORE_MAX_FILE_SIZE: 1,
    OVER_STORE_MAX_TOTAL_SIZE: 2,
    PLAN_STATUS_UNEXPECTED: 3,
  },

  NOTICE: {
    COMMON: 'common',
    TASK_EXPIRE: 'task.expire',
  },

  OBJECT_TYPE: {
    FIELD: 'field',
    ANNOUNCEMENT: 'announcement',
    ANNOUNCEMENT_DRAFT: 'announcement.draft',
    APPROVAL_ITEM: 'approval.item',
    APPROVAL_TEMPLATE: 'approval.template',
    ATTENDANCE: 'attendance',
    ATTENDANCE_SIGN_DATA: 'attendance.sign.data',
    COMPANY: 'company',
    COMPANY_ADMIN: 'company.admin',
    COMPANY_MEMBER: 'company.member',
    COMPANY_DIR: 'company.dir',
    COMPANY_FILE: 'company.file',
    DOCUMENT: 'document',
    DOCUMENT_DIR: 'document.dir',
    DOCUMENT_FILE: 'document.file',
    PROJECT: 'project',
    PROJECT_TAG: 'project.tag',
    PROJECT_MEMBER: 'project.member',
    PROJECT_ADMIN: 'project.admin',
    PROJECT_DIR: 'project.dir',
    PROJECT_FILE: 'project.file',
    PROJECT_DISCUSSION: 'project.discussion',
    REMINDING: 'reminding',
    REQUEST: 'request',
    SCHEDULE: 'schedule',
    SUBTASK: 'subtask',
    TASK: 'task',
    TASK_TAG: 'task.tag',
    TASK_FOLLOWER: 'task.follower',
    TASK_EXPIRE: 'task.expire',
    USER: 'user'
  },

  PROJECT_MEMBER_TYPE: {
    GUEST: 'guest',
    NORMAL: 'normal',
    ADMIN: 'admin',
    OWNER: 'owner',
    SUPERVISOR: 'supervisor',
  },

  REQUEST_TYPE: {
    COMPANY: 'company',
  },

  REQUEST_STATUS: {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    EXPIRED: 'expired',
  },

  SEX: {
    FEMALE: 'F',
    MALE: 'M',
  },

  TASK_STATUS: {
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    PAUSED: 'paused',
    CHECKING: 'checking',
    DELETED: 'deleted',
  },

  TASK_PRIORITY: {
    LEVEL_0: 0,
    LEVEL_1: 1,
    LEVEL_2: 2,
    LEVEL_3: 3,
  },

  TASK_LOG_TYPE: {
    CREATE: 'create',             // 创建
    COMPLETE: 'complete',         // 完成
    REOPEN: 'reopen',             // 重新开启
    TITLE: 'title',               // 标题
    DESCRIPTION: 'description',   // 描述
    TAG: 'tag',                   // 标签
    FOLLOWERS: 'followers',       // 关注者
    FOLLOW: 'follow',             // 关注
    UNFOLLOW: 'follow',           // 关注
    PRIORITY: 'priority',         // 优先级
  },

  USER_ID_TYPE: {
    EMAIL: 'email',
    MOBILE: 'mobile',
  },

  USER_ACTIVITY: {
    LOGIN: 'login',
    LOGOUT: 'logout',
    LOGIN_FAIL: 'login_fail',
    CHANGE_PASSW: 'change_passw',
    BIND_WECHAT: 'bind_wechat',
    UNBIND_WECHAT: 'unbind_wechat',
  },

  CLIENT_ID: {
    WEB: 'com_tlifang_web',
    MOBILE: 'com_tlifang_mobile',
    WECHAT: 'com_tlifang_wechat',
  },

  TEAMPLAN: {
    FREE: 'free',
    PRO: 'pro',
    ENT: 'ent',
  },
  TEAMPLAN_PAID: {
    PRO: 'pro',
    ENT: 'ent',
  },
  PLAN_STATUS: {
    ACTIVED: 'actived',
    EXPIRED: 'expired',
    OVERDUE: 'overdue',
  },
  AUTH_STATUS: {
    POSTED: 'posted',
    CANCELLED: 'cancelled',
    REPOSTED: 'reposted',
    EXPIRED: 'expired',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
  },
  ORDER_TYPE: {
    NEWLY: 'newly',
    RENEWAL: 'renewal',
    UPGRADE: 'upgrade',
    DEGRADE: 'degrade',
    PATCH: 'patch',
  },
  ORDER_STATUS: {
    CREATED: 'created',
    PAYING: 'paying',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled',
    SUCCEED: 'succeed'
  },
  CHARGE_STATUS: {
    PAYING: 'paying',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled',
    SUCCEED: 'succeed'
  },
  CHARGE_TYPE: {
    PLAN: 'plan',
    RECHARGE: 'recharge',
  },
  PRODUCT_NO: {
    PLAN: 'P0001',
    MEMBER: 'P0002',
  },

  GENDER: {
    FEMALE: 'F',
    MALE: 'M',
  },
  TEAM_TYPE: {
    NONE_PROFIT: 'none-profit',
    WORKSHOP: 'workshop',
    STARTUP: 'startup',
  },
  PAYMENT_METHOD: {
    ALIPAY: 'alipay',
    WECHAT: 'wechat',
    BALANCE: 'balance',
  },
  DISCOUNT_STATUS: {
    NORMAL: 'normal',
    DELETED: 'deleted',
  },
  COUPON_STATUS: {
    NORMAL: 'normal',
    ARCHIVED: 'archived',
    DELETED: 'deleted',
  },
  COMPANY_COUPON_STATUS: {
    UNUSED: 'unused',
    USED: 'used'
  },
  INVOICE_STATUS: {
    CREATING: 'creating',
    CREATED: 'created',
    SENT: 'sent',
    FINISHED: 'finished',
    VERIFING: 'verifing',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled',
  }

};

export default constants;
export let ENUMS = _.mapObject(constants, c => _.values(c));
export let BASE_PATH = path.normalize(__dirname + '/../../');
