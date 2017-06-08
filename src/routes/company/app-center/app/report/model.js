import Promise from 'bluebird';
import Base from '../../base';
import moment from 'moment';
import { ApiError } from 'lib/error';
import _ from 'underscore';
import { ObjectId } from 'mongodb';


export default class Report extends Base {

  constructor() {
    super();
  }

  overview({user_id, company_id}) {
    return Promise.all([
      this.collection('item').count({user_id, company_id}),
      this.collection('item').count({report_target: user_id, company_id}),
      this.collection('item').findOne({user_id, company_id}, {date_create:1}),
      this.collection('item').findOne({report_target: user_id, company_id}, {date_create:1}),
    ]).then(([totalReport, totalReceived, reportDate, receiveDate]) => {
      return {
        totalReport,
        totalReceived,
        firstDate: reportDate-receiveDate ? reportDate-receiveDate > 0 ? reportDate: receiveDate : 0
      };
    });
  }

  review({user_id, company_id}) {
    return Promise.all([
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
          copy_to: { $in: [user_id] },
          company_id,
          type: item,
          date_create: {
            $gte: moment().startOf(item).toDate()
          }
        });
      }),
    ]).then(([mine, received]) => {
      return {
        mine: {
          day: mine[0],
          week: mine[1],
          month: mine[2],
        },
        received: {
          day: received[0],
          week: received[1],
          month: received[2],
        }
      };
    });
  }

  list({user_id, company_id, page, pagesize, type, status, start_date, end_date}) {
    let criteria;
    if (start_date && end_date) {
      criteria.date_report = { $gte: start_date, $lte: end_date };
    } else if (start_date) {
      criteria.date_report = { $gte: start_date };
    } else if (end_date) {
      criteria.date_report = { $lte: end_date };
    }
    if (type == 'inbox') {
      if (status) {
        criteria.status = status;
      }
      criteria.user_id = user_id;
      criteria.company_id = company_id;
    } else if (type == 'outbox') {
      if (status && status != 'draft'){
        criteria.status = status;
      } else if (status && status == 'draft') {
        throw new ApiError(400, 'invalid_status');
      }
      criteria.user_id = user_id;
      criteria.company_id = company_id;
    } else {
      throw new ApiError(400, 'invalid_box_check');
    }
    return this.collection('item').find(criteria,
      {
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
    let { date_report, report_target, copy_to, content, type, status, attachment } = report;
    return this.collection('item').insert({
      user_id,
      company_id,
      date_report: new Date(date_report),
      report_target,
      copy_to,
      content,
      type,
      status,
      attachment,
      comments: [],
      date_create: new Date(),
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
      if (doc.user_id != user_id) {
        throw new ApiError(400, 'invalid_user');
      }
      if (doc.status == 'applied' || doc.status == 'agreed') {
        throw new ApiError(400, 'invalid_modified');
      }
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
      if (doc.report_target != user_id) {
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
      if (doc.report_target != user_id.toString() && !_.contains(doc.copy_to, user_id.toString()) ) {
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
