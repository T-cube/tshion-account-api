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

  overview({user_id, company_id, memberDepartments}) {
    return Promise.all([
      this.collection('item').count({ user_id, company_id }),
      this.collection('item').count({ report_target: { $in: memberDepartments }, company_id }),
      this.collection('item').findOne({ user_id, company_id }, { date_create: 1 }),
      this.collection('item').findOne({ report_target: { $in: memberDepartments }, company_id }, { date_create: 1 }),
      Promise.map(['day', 'week', 'month'], item => {
        return this.collection('item').count({
          user_id,
          company_id,
          type: item,
          date_report: {
            $gte: moment().startOf(item).subtract(1, item+'s').toDate()
          }
        });
      }),
      Promise.map(memberDepartments, department => {
        return Promise.map(['day', 'week', 'month'], item => {
          return this.collection('item').count({
            report_target: department,
            company_id,
            type: item,
            date_report: {
              $gte: moment().startOf(item).subtract(1, item+'s').toDate()
            }
          });
        }).then(list => {
          return {
            department_id: department,
            day: list[0],
            week: list[1],
            month: list[2]
          };
        });
      }),
      Promise.map(['day', 'week', 'month'], item => {
        return this.collection('item').count({
          user_id,
          company_id,
          type: item
        });
      })
    ]).then(([totalReported, totalReceived, reported, received, from_me, to_me, total]) => {
      let report_date = reported ? reported.date_create : 0;
      let receive_date = received ? received.date_create : 0;
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
        to_me,
        total: {
          day: total[0],
          week: total[1],
          month: total[2]
        }
      };
    });
  }

  list({user_id, company_id, page, pagesize, type, status, start_date, end_date, reporter, report_type, report_target}) {
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
      if (report_target) {
        criteria.report_target = report_target;
      }
      if (status) {
        criteria.status = status;
      }
    } else if (type == C.BOX_TYPE.INBOX) {
      if (_.isArray(report_target)) {
        criteria['$or'] = [{ report_target: { $in: report_target } }, { copy_to: user_id }];
      } else {
        criteria['$or'] = [{ report_target: report_target }, { copy_to: user_id }];
      }
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
    return Promise.all([
      this.collection('item').count(criteria),
      this.collection('item').find(criteria,
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
    ]).then(([count, list]) => {
      return { count, list };
    });
  }

  detail({company_id, user_id, type, report_id, report_type, report_target, reporter}) {
    return this.collection('item').findOne({
      _id: report_id,
    }).then(report => {
      let criteria = {};
      criteria.company_id = company_id;
      if (type == 'outbox') {
        criteria.user_id = user_id;
      }
      if (report_type) {
        criteria.type = report_type;
      }
      if (report_target) {
        criteria.report_target = report_target;
      } else {
        if (type == 'inbox') {
          criteria.status = { $ne: C.REPORT_STATUS.DRAFT };
          criteria['$or'] = [{ report_target: report.report_target }, { copy_to: user_id }];
        }
      }
      if (reporter) {
        criteria.user_id = reporter;
      }
      return Promise.all([
        this.collection('item').find(_.extend(criteria,{date_report:{$lt:report.date_report}}), {
          _id: 1
        })
        .sort({report_date: 1})
        .limit(1),
        this.collection('item').find(_.extend(criteria,{date_report:{$gt:report.date_report}}), {
          _id: 1
        })
        .sort({report_date: 1})
        .limit(1)
      ])
      .then(([prevId, nextId]) => {
        report.nextId = nextId[0];
        report.prevId = prevId[0];
        return report;
      });
    });
  }

  month({user_id, company_id, type, start_date, end_date, status, reporter, report_target, report_type}) {
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
      if (report_target) {
        criteria.report_target = report_target;
      }
      if (status) {
        criteria.status = status;
      }
    } else if (type == C.BOX_TYPE.INBOX) {
      if (_.isArray(report_target)) {
        criteria['$or'] = [{ report_target: { $in: report_target } }, { copy_to: user_id }];
      } else {
        criteria['$or'] = [{ report_target: report_target }, { copy_to: user_id }];
      }
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
    return this.collection('item')
    .find(criteria, {
      _id: 1,
      date_report: 1
    })
    .then(list => {
      _.map(list, item => {
        item.date = moment(item.report_date).get('date');
        delete item.report_date;
        return item;
      });
      return list;
    });
  }

  report({user_id, company_id, report}) {
    let { date_report, report_target, copy_to, content, type, status, attachments } = report;
    date_report = moment(date_report).startOf('day').toDate();
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
      if (!doc.status == C.REPORT_STATUS.DRAFT) {
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

  mark({user_id, status, content, memberDepartments, report_id}) {
    return this.collection('item').findOne({
      _id: report_id
    }).then(doc => {
      if (!doc) {
        throw new ApiError(400, 'invalid_report');
      }
      if (!_.some(memberDepartments, item => item.equals(doc.report_target))) {
        throw new ApiError(400, 'invalid_user');
      }
      let action;
      if (status == C.REPORT_STATUS.AGREED) {
        action = 'agree';
      } else {
        action = 'reject';
      }
      return this.collection('item').update({
        _id: report_id
      }, {
        $set: { status: status },
        $push: {
          comments: {
            _id:  ObjectId(),
            user_id,
            action,
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

  comment({user_id, content, memberDepartments, report_id}) {
    return this.collection('item').findOne({
      _id: report_id
    }).then(doc => {
      if (!doc) {
        throw new ApiError(400, 'invalid_report');
      }
      if (!_.some(memberDepartments, item => item.equals(doc.report_target)) && !doc.user_id.equals(user_id) && !_.some(doc.copy_to, item => item.equals(user_id)) ) {
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

  reportCancel({user_id, report_id}) {
    return this.collection('item').findOne({
      _id: report_id
    })
    .then(report => {
      if (!report) {
        throw new ApiError(400, 'invalid_report');
      }
      if (!report.user_id.equals(user_id)) {
        throw new ApiError(400, 'invalid_user');
      }
      if (report.status == C.REPORT_STATUS.AGREED) {
        throw new ApiError(400, 'invalid_modified');
      }
      return this.collection('item').update({
        _id: report_id
      }, {
        $set: { status: C.REPORT_STATUS.DRAFT },
        $push: {
          comments: {
            _id:  ObjectId(),
            user_id,
            action: 'cancel',
            new_status: C.REPORT_STATUS.DRAFT,
            date_create: new Date()
          }
        }
      });
    });
  }

  reportDelete({user_id, report_id}) {
    return this.collection('item').findOne({
      _id: report_id
    })
    .then(report => {
      if (!report) {
        throw new ApiError(400, 'invalid_report');
      }
      if (!report.user_id.equals(user_id)) {
        throw new ApiError(400, 'invalid_user');
      }
      if (!report.status == C.REPORT_STATUS.DRAFT) {
        throw new ApiError(400, 'invalid_delete');
      }
      return this.collection('item').remove({
        _id: report_id
      });
    });
  }

}
