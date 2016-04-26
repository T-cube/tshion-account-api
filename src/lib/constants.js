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

  INVITING_STATUS: {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
  },

  COMPANY_MEMBER_TYPE: {
    NORMAL: 'normal',
    ADMIN: 'admin',
    OWNER: 'owner',
  },

  PROJECT_MEMBER_TYPE: {
    GUEST: 'guest',
    NORMAL: 'normal',
    ADMIN: 'admin',
    OWNER: 'owner',
    SUPERVISOR: 'supervisor',
  },

  TASK_STATUS: {
    WAITING: 'waiting',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    PAUSED: 'paused',
    DELETED: 'deleted',
  }
}

function buildList(constants) {
  return _.values(constants);
}

export default constants;
export let ENUMS = _.mapObject(constants, c => _.values(c));
