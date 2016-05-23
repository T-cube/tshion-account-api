import _ from 'underscore';

// application constants

let constants = {

  ACTIVITY_ACTION: {
    // 常规操作
    ADD: 'add',            // 添加
    REMOVE: 'remove',      // 添加
    CREATE: 'create',      // 创建
    UPDATE: 'update',      // 更新（字段）
    DELETE: 'delete',      // 删除
    // 管理操作
    TRANSFER: 'tansfer',   // 转让
    // 邀请
    ACCEPT: 'accept',      // 接受
    REJECT: 'reject',      // 拒绝
    // 任务
    COMPLETE: 'complete',  // 关注
    REOPEN: 'reopen',      // 取消关注
    // 关注
    FOLLOW: 'follow',      // 关注
    UNFOLLOW: 'unfollow',  // 取消关注
    // 文件操作
    RENAME: 'rename',      // 重命名
    UPLOAD: 'upload',      // 上传

    SCHEDULE_REMINDING: 'schedule.reminding', // 日程提醒
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
    REVOKED: 'revoked'
  },

  APPROVAL_STATUS: {
    NORMAL: 'normal',
    UNUSED: 'unused',
  },

  APPROVER_TYPE: {
    DEPARTMENT: 'department',
    MEMBER: 'member',
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
    COMPANY: 'company',
    COMPANY_MEMBER: 'company.member',
    COMPANY_DIR: 'company.dir',
    COMPANY_FILE: 'company.file',
    PROJECT: 'project',
    PROJECT_TAG: 'project.tag',
    PROJECT_MEMBER: 'project.member',
    PROJECT_DIR: 'project.dir',
    PROJECT_FILE: 'project.file',
    REQUEST: 'request',
    TASK: 'task',
    TASK_TAG: 'task.tag',
    TASK_FOLLOWER: 'task.follower',
    SCHEDULE_REMINDING: 'schedule.reminding',
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
    WAITING: 'pending',
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

}

function buildList(constants) {
  return _.values(constants);
}

export default constants;
export let ENUMS = _.mapObject(constants, c => _.values(c));
