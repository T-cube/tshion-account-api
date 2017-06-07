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

  count({user_id, company_id}) {
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

  list({user_id, company_id, page, pagesize, queryTarget}) {
    return this.collection('item').find({
      [queryTarget]: user_id,
      company_id,
    })
    .sort({id: -1})
    .skip((page - 1) * pagesize)
    .limit(pagesize)
    .then(list => {
      return list;
    });
  }

  detail({user_id, company_id, report_id}) {
    return this.collection('item').findOne({
      _id: report_id,

    })
  }

  recentReport({user_id, company_id, queryTarget}) {
    return Promise.map(['day', 'week', 'month'], item => {
      return this.collection('item').find({
        [queryTarget]: queryTarget == 'user_id' ? user_id : { $in: [user_id] },
        company_id,
        type: item,
        date_create: {
          $gte: moment().startOf(item).toDate()
        }
      });
    }).then(data => {
      if (!data || !data.length) throw new ApiError(400, 'invalid_data');
      return {
        day: data[0],
        week: data[1],
        month: data[2]
      };
    });
  }

  report({user_id, company_id, report, status}) {
    let { date_report, report_target, copy_to, content, type, attachment } = report;
    report_target = ObjectId(report_target);
    _.map(copy_to, item => {
      return ObjectId(item);
    });
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
