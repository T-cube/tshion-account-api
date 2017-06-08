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

  list({user_id, company_id, page, pagesize, type, status}) {
    let criteria;
    if (type == 'inbox') {
      criteria = {
        user_id,
        company_id,
      };
    } else if (type == 'outbox') {
      criteria = {
        company_id,
        copy_to: { $in: [user_id] },
      };
    } else {
      throw new ApiError(400, 'invalid_box_check');
    }
    return this.collection('item').find(criteria)
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

}
