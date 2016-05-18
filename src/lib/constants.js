import _ from 'underscore';

// application constants

let constants = {

  ACTIVITY_ACTION: {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    ACCEPT: 'accept',
    REJECT: 'reject',

    TASK_COMPLETE: 'task.complete',         // 完成
    TASK_REOPEN: 'task.reopen',             // 重新开启
    TASK_FOLLOW: 'task.follow',             // 关注
    TASK_UNFOLLOW: 'task.unfollow',         // 取消关注
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
    SELF: 'self',
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
    TASK_FOLLOWERS: 'task.followers',
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
