import _ from 'underscore';
import path from 'path';

// application constants

let constants = {

  ACTIVITY_ACTION: {
    // 常规操作
    ADD: 'add',            // 添加
    REMOVE: 'remove',      // 移除
    CREATE: 'create',      // 创建
    UPDATE: 'update',      // 更新（字段）
    DELETE: 'delete',      // 删除
    // 管理操作
    TRANSFER: 'tansfer',   // 转让
    // 邀请、审批
    ACCEPT: 'accept',      // 接受
    APPROVE: 'approve',    // 通过
    REJECT: 'reject',      // 拒绝
    REVOKE: 'revoke',      // 撤回
    SUBMIT: 'submit',      // 提交
    COPY: 'copy',          // 抄送
    CANCEL: 'cancel',      // 取消
    // 任务
    COMPLETE: 'complete',  // 关注
    REOPEN: 'reopen',      // 取消关注
    // 关注
    FOLLOW: 'follow',      // 关注
    UNFOLLOW: 'unfollow',  // 取消关注
    // 文件操作
    RENAME: 'rename',      // 重命名
    UPLOAD: 'upload',      // 上传

    SYSTEM_SET: 'system.set', // 提醒

    SIGN: 'sign',          // 签到
    SIGN_AUDIT: 'sign.audit', // 补签

    RELEASE: 'release',   // 发布
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

  OBJECT_TYPE: {
    FIELD: 'field',
    ANNOUNCEMENT: 'announcement',
    APPROVAL_ITEM: 'approval.item',
    APPROVAL_TEMPLATE: 'approval.template',
    ATTENDANCE: 'attendance',
    COMPANY: 'company',
    COMPANY_MEMBER: 'company.member',
    COMPANY_DIR: 'company.dir',
    COMPANY_FILE: 'company.file',
    DOCUMENT_DIR: 'document.dir',
    DOCUMENT_FILE: 'dir.file',
    PROJECT: 'project',
    PROJECT_TAG: 'project.tag',
    PROJECT_MEMBER: 'project.member',
    PROJECT_DIR: 'project.dir',
    PROJECT_FILE: 'project.file',
    REMINDING: 'reminding',
    REQUEST: 'request',
    SCHEDULE: 'schedule',
    TASK: 'task',
    TASK_TAG: 'task.tag',
    TASK_FOLLOWER: 'task.follower',
    TASK_EXPIRE: 'task.expire',
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
  },

  SEX: {
    FEMALE: 'F',
    MALE: 'M',
  },

  TASK_STATUS: {
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    PAUSED: 'paused',
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

  NOTICE: {
    COMMON: 'common',
    TASK_EXPIRE: 'task.expire',
  },

};

export default constants;
export let ENUMS = _.mapObject(constants, c => _.values(c));
export let BASE_PATH = path.normalize(__dirname + '/../../');
