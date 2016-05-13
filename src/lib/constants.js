import _ from 'underscore';

// application constants

let constants = {

  USER_ID_TYPE: {
    EMAIL: 'email',
    MOBILE: 'mobile',
  },

  SEX: {
    FEMALE: 'F',
    MALE: 'M',
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

  MESSAGE_TARGET_TYPE: {
    REQUEST: 'Request',
    COMPANY: 'Company',
    COMPANY_MEMBER: 'CompanyMember',
    PROJECT: 'Project',
    PROJECT_MEMBER: 'ProjectMember',
    TASK: 'Task',
  },

  MESSAGE_VERB: {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
  },

  PROJECT_MEMBER_TYPE: {
    GUEST: 'guest',
    NORMAL: 'normal',
    ADMIN: 'admin',
    OWNER: 'owner',
    SUPERVISOR: 'supervisor',
  },

  TASK_STATUS: {
    WAITING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    PAUSED: 'paused',
    DELETED: 'deleted',
  },

  REQUEST_TYPE: {
    COMPANY: 'company',
  },

  REQUEST_STATUS: {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
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

  APPROVAL_STATUS: {
    NORMAL: 'normal',
    UNUSED: 'unused',
  },

  APPROVER_TYPE: {
    DEPARTMENT: 'department',
    MEMBER: 'member',
  },

  FORM_TYPE: {
    TEXT: 'text',
    TEXTAREA: 'textarea',
    DATE: 'date',
  },

  APPROVAL_ITEM_STATUS: {
    PROCESSING: 'processing',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    REVOKED: 'revoked'
  },

  ANNOUNCEMENT_TYPE: {
    NOTICE: 'notice',
    NEWS: 'news',
  },

}

function buildList(constants) {
  return _.values(constants);
}

export default constants;
export let ENUMS = _.mapObject(constants, c => _.values(c));
