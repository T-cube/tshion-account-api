import _ from 'underscore';

let constants = {
  REPORT_STATUS: {
    DRAFT: 'draft',
    APPLIED: 'applied',
    AGREED: 'agreed',
    REJECTED: 'rejected',
  },
  REPORT_TYPE: {
    DAY: 'day',
    WEEK: 'week',
    MONTH: 'month',
  },
  BOX_TYPE: {
    INBOX: 'inbox',
    OUTBOX: 'outbox',
  }
};

export default constants;
export let ENUMS = _.mapObject(constants, c => _.values(c));
