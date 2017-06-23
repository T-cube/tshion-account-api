import Promise from 'bluebird';
import moment from 'moment';
import _ from 'underscore';
import { ObjectId } from 'mongodb';

import AppBase from 'models/app-base';
import { ApiError } from 'lib/error';
import C from './constants';

export default class Report extends AppBase {

  constructor(options) {
    super(options);
  }

  overview({user_id, company_id}) {
    return Promise.all([
      this.collection('item').count({ user_id, company_id }),
      this.collection('item').count({ report_target: user_id, company_id }),
      this.collection('item').findOne({ user_id, company_id }, { date_create: 1 }),
      this.collection('item').findOne({ report_target: user_id, company_id }, { date_create: 1 }),
      Promise.map(['day', 'week', 'month'], item => {
        return this.collection('item').find({
          user_id,
          company_id,
          type: item,
          date_create: {
            $gte: moment().startOf(item).toDate()
          }
        });
      }),
      Promise.map(['day', 'week', 'month'], item => {
        return this.collection('item').find({
          report_target: user_id,
          company_id,
          type: item,
          date_create: {
            $gte: moment().startOf(item).toDate()
          }
        });
      }),
    ]).then(([totalReported, totalReceived, reported, received, from_me, to_me]) => {
      let report_date = reported ? reported.date_create : 0;
      let receive_date = reported ? received.date_create : 0;
      let firstDate = _.min([report_date, receive_date]);
      return {
        totalReported,
        totalReceived,
        firstDate,
        from_me: {
          day: from_me[0],
          week: from_me[1],
          month: from_me[2],
        },
        to_me: {
          day: to_me[0],
          week: to_me[1],
          month: to_me[2],
        }
      };
    });
  }

  list({user_id, company_id, page, pagesize, type, status, start_date, end_date, reporter, report_type}) {
    let criteria = {};
    criteria.company_id = company_id;
    if (report_type) {
      criteria.type = report_type;      
    }
    if (start_date && end_date) {
      criteria.date_report = { $gte: start_date, $lte: end_date };
    } else if (start_date) {
      criteria.date_report = { $gte: start_date };
    } else if (end_date) {
      criteria.date_report = { $lte: end_date };
    }
    if (type == C.BOX_TYPE.OUTBOX) {
      criteria.user_id = user_id;
      if (status) {
        criteria.status = status;
      }
    } else if (type == C.BOX_TYPE.INBOX) {
      criteria['$or'] = [{ report_target: user_id }, { copy_to: user_id }];
      if (reporter) {
        criteria.user_id = reporter;
      }
      if (status) {
        if (status == C.REPORT_STATUS.DRAFT) {
          throw new ApiError(400, 'invalid_status');
        } else {
          criteria.status = status;
        }
      } else {
        criteria.status = { $ne: C.REPORT_STATUS.DRAFT };
      }
    }
    return this.collection('item').find(criteria,
      {
        user_id: 1,
        type: 1,
        date_report: 1,
        status: 1,
        report_target: 1,
      })
    .sort({id: -1})
    .skip((page - 1) * pagesize)
    .limit(pagesize)
    .then(list => {
      return list;
    });
  }

  detail(report_id) {
    return this.collection('item').findOne({
      _id: report_id,
    }).then(doc => {
      return doc;
    });
  }


  report({user_id, company_id, report}) {
    let { date_report, report_target, copy_to, content, type, status, attachments } = report;
    return this.collection('item').insert({
      user_id,
      company_id,
      date_report,
      report_target,
      copy_to,
      content,
      type,
      status,
      attachments,
      comments: [],
      date_create: new Date(),
      date_update: new Date(),
    }).then(doc => {
      return doc;
    });
  }

  reportUpdate({user_id, report_id, report}) {
    return this.collection('item').findOne({
      _id: report_id
    }).then(doc => {
      if (!doc) {
        throw new ApiError(400, 'invalid_report');
      }
      if (!doc.user_id.equals(user_id)) {
        throw new ApiError(400, 'invalid_user');
      }
      if (doc.status == C.REPORT_STATUS.APPLIED || doc.status == C.REPORT_STATUS.AGREED) {
        throw new ApiError(400, 'invalid_modified');
      }
      report.date_update = new Date();
      return this.collection('item').update({
        _id: report_id
      }, {
        $set: report
      }).then(modified => {
        return modified;
      });
    });
  }

  mark({user_id, status, content, report_id}) {
    return this.collection('item').findOne({
      _id: report_id
    }).then(doc => {
      if (!doc) {
        throw new ApiError(400, 'invalid_report');
      }
      if (!doc.report_target.equals(user_id)) {
        throw new ApiError(400, 'invalid_user');
      }
      return this.collection('item').update({
        _id: report_id
      }, {
        $set: { status: status },
        $push: {
          comments: {
            _id:  ObjectId(),
            user_id,
            action: status.slice(0, -1),
            new_status: status,
            content,
            date_create: new Date()
          }
        }
      }).then(doc => {
        return doc;
      });
    });
  }

  comment({user_id, content, report_id}) {
    return this.collection('item').findOne({
      _id: report_id
    }).then(doc => {
      if (!doc) {
        throw new ApiError(400, 'invalid_report');
      }
      if (!doc.report_target.equals(user_id) && !_.some(doc.copy_to, item => item.equals(user_id)) ) {
        throw new ApiError(400, 'invalid_user');
      }
      return this.collection('item').update({
        _id: report_id
      }, {
        $push: {
          comments: {
            _id: ObjectId(),
            user_id,
            action: 'comment',
            content,
            date_create: new Date()
          }
        }
      }).then(doc => {
        return doc;
      });
    });
  }

}
