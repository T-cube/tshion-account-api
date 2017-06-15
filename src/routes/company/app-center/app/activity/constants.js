import _ from 'underscore';

let constants = {
  APPROVAL_STATUS: {
    AGREED: 'agreed',
    PENDING: 'pending',
    REJECTED: 'rejected',
  },
  ACTIVITY_QUERY_LIMIT: 2,
  LIST_RANGE: {
    PAST: 'past',
    NOW: 'now',
    FEATURE: 'feature'
  },
  LIST_TARGET: {
    MINE: 'mine',
    ALL: 'all',
  }
};

export default constants;
export let ENUMS = _.mapObject(constants, c => _.values(c));
