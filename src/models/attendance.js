import _ from 'underscore';
import moment from 'moment';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import { diffObjectId } from 'lib/utils';
import Structure from 'models/structure';
import C from 'lib/constants';

export default class Attendance {

  constructor(attendanceSetting) {
    this.setting = attendanceSetting;
    this.setting.holiday = this.setting.holiday.map(i => moment(new Date(i.date)).format('YYYY-MM-DD'));
    this.setting.workday_special = this.setting.workday_special.map(i => moment(new Date(i.date)).format('YYYY-MM-DD'));
  }

  updateSign(data, user_id, isPatch) {
    let { date, from_pc } = data;
    data = data.data;
    let now = date ? new Date(date) : new Date();
    date = now.getDate();
    let month = now.getMonth() + 1;
    let year = now.getFullYear();
    let defaultCriteria = {
      user: user_id,
      year: year,
      month: month,
      company: this.setting._id,
    };
    return db.attendance.sign.findOne(_.extend({}, defaultCriteria, {
      'data.date': date,
    }), {
      time_start: 1,
      time_end: 1,
      'data.$.': 1
    })
    .then(doc => {
      let parsedData;
      if (!doc) {
        parsedData = this._parseSignFromUser(data, `${year}-${month}-${date}`, doc, isPatch, from_pc);
        return db.attendance.sign.update(defaultCriteria, parsedData.update, {
          upsert: true
        })
        .then(() => parsedData.record);
      } else {
        let newData = [];
        data.forEach(item => {
          if (doc.data[0][item.type] && !isPatch) {
            throw new ApiError(400, 'user_has_signed');
          }
          newData.push(item);
        });
        parsedData = this._parseSignFromUser(newData, `${year}-${month}-${date}`, doc, isPatch, from_pc);
        return db.attendance.sign.update({
          _id: doc._id,
          'data.date': date,
        }, parsedData.update)
        .then(() => parsedData.record);
      }
    });
  }

  _parseSignFromUser(data, date, docExist, isPatch, from_pc) {
    let settings = this.setting;
    let record = {};
    data.forEach(item => {
      record[item.type] = {
        time: new Date(item.date)
      };
      if (from_pc) {
        record[item.type]['from_pc'] = from_pc;
      }
      if (isPatch) {
        record[item.type]['patch'] = true;
      }
      if (item.type == 'sign_in') {
        record[item.type]['setting'] = new Date(`${date} ${settings.time_start}`);
      } else {
        record[item.type]['setting'] = new Date(`${date} ${settings.time_end}`);
      }
    });

    if (!docExist) {
      record.date = new Date(date).getDate();
      return {
        update: {
          $push: {
            data: record
          }
        },
        record
      };
    } else {
      return {
        update: {
          $set: _.object(Object.keys(record).map(key => `data.$.${key}`), _.values(record))
        },
        record
      };
    }
  }

  _parseSignData(data, date, docExist, isPatch, from_pc) {
    let settings = this.setting;
    let recordType = [];
    data.forEach(item => {
      let signDate = new Date(item.date);
      if (item.type == 'sign_in') {
        if (new Date(`${date} ${settings.time_start}`) < signDate) {
          recordType.push('late');
        }
      } else {
        if (new Date(`${date} ${settings.time_end}`) > signDate) {
          recordType.push('leave_early');
        }
      }
    });
    let patch = data.map(i => i.type);
    if (!docExist) {
      let update = {
        date: new Date(date).getDate(),
      };
      data.forEach(item => {
        update[item.type] = item.date;
        update['from_pc'] = from_pc;
      });
      isPatch && (update.patch = patch);
      recordType.forEach(type => update[type] = true);
      update = {
        $push: {
          data: update
        }
      };
      return update;
    } else {
      let update = {};
      recordType.forEach(type => update['data.$.' + type] = true);
      data.forEach(item => {
        update['data.$.' + item.type] = item.date;
        update['data.$.from_pc'] = from_pc;
      });
      if (isPatch) {
        let existPatch = docExist.data[0].patch;
        if (existPatch && existPatch.length) {
          patch = patch.concat(existPatch);
        }
        update['data.$.patch'] = patch;
      }
      return !_.isEmpty(update) ? {
        $set: update
      } : {};
    }
  }

  isWorkDay(date) {
    date = new Date(date);
    let weekday = date.getDay();
    let setting = this.setting;
    date = moment(date).format('YYYY-MM-DD');
    if (_.contains(setting.workday_special, date)) {
      return true;
    }
    if (_.contains(setting.holiday, date)) {
      return false;
    }
    if (setting.workday && setting.workday.length) {
      return _.contains(setting.workday, weekday);
    }
    return false;
  }

  getMonthWorkdayCount(year, month) {
    if (_.isDate(year)) {
      let date = year;
      year = date.getFullYear();
      month = date.getMonth() + 1;
    }
    let count = 0;
    let days = this._getMonthDays(year, month);
    days.forEach(day => {
      if (this.isWorkDay(`${year}-${month}-${day}`)) {
        count += 1;
      }
    });
    return count;
  }

  getMonthWorkdayAttendCount(data, year, month) {
    if (_.isDate(year)) {
      let date = year;
      year = date.getFullYear();
      month = date.getMonth() + 1;
    }
    let count = 0;
    let days = this._getMonthDays(year, month);
    days.forEach(day => {
      if (this.isWorkDay(`${year}-${month}-${day}`) && _.find(data, item => item.date == day)) {
        count += 1;
      }
    });
    return count;
  }

  _getMonthDays(year, month) {
    let now = new Date();
    let isCurrentMonth = now.getMonth() == (month - 1);
    let lastDateOfMonth = isCurrentMonth
      ? now.getDate()
      : moment([year, month, 1]).subtract(1, 'day').toDate().getDate();
    // let firstWeekday = moment([year, month - 1, 1]).toDate().getDay();
    return _.range(1, lastDateOfMonth + 1);
  }

  parseUserRecord(data, year, month) {
    let workday_all = this.getMonthWorkdayCount(year, month);
    let attend_all = data.length;
    let workday_attend = this.getMonthWorkdayAttendCount(data, year, month);
    let record = {
      normal: 0,
      late: 0,
      leave_early: 0,
      workday_real: attend_all,
      workday_all: workday_all,
      extra_work: attend_all - workday_attend,
      absent: workday_all - workday_attend,
      patch: 0,
      no_sign_in: 0,
      no_sign_out: 0,
    };
    data.forEach(item => {
      let tempRecord = _.clone(record);
      if (item.sign_in) {
        if (item.sign_in.time > item.sign_in.setting) {
          record.late += 1;
        }
        if (item.sign_in.patch) {
          record.patch += 1;
        }
      } else {
        record.no_sign_in += 1;
      }
      if (item.sign_out) {
        if (item.sign_out.time < item.sign_out.setting) {
          record.leave_early += 1;
        }
        if (item.sign_out.patch) {
          record.patch += 1;
        }
      } else {
        record.no_sign_out += 1;
      }
      if (_.isEqual(tempRecord, record)) {
        record.normal += 1;
      }
    });
    return record;
  }

  isAuditor(user_id) {
    return this.setting.auditor && this.setting.auditor.equals(user_id);
  }

  static audit(companyId, userId, data) {
    return db.attendance.setting.findOne({
      _id: companyId,
      // is_open: true,
    })
    .then(setting => {
      if (!setting) {
        return;
      }
      let signData = [];
      ['sign_in', 'sign_out'].forEach(type => {
        let date = data[type];
        if (data[type] && moment(date).isValid()) {
          signData.push({
            type,
            date,
          });
        }
      });
      let date = data.date;
      if (!moment(date).isValid() || !signData.length) {
        return;
      }
      return new Attendance(setting).updateSign({
        date,
        data: signData,
      }, userId, true);
    });
  }

  getDepartmentRecord(company, department_id, query) {
    let tree = new Structure(company.structure);
    let members = tree.getMemberAll(department_id).map(member => member._id);
    let totalrows = members.length;
    let { year, month, page, pageSize } = query;
    page && pageSize && (members = members.slice((page - 1) * pageSize, page * pageSize));
    return db.attendance.record.findOne({
      company: company._id,
      year: year,
      month: month,
      member: {
        $in: members
      }
    })
    .then(record => {
      if (record) {
        return record.map(item => {
          item.data.user = item.member;
          return item.data;
        });
      }
      return db.attendance.sign.find({
        user: {
          $in: members
        },
        year: year,
        month: month,
        company: company._id,
      })
      .then(doc => {
        let signRecord = [];
        doc.forEach(sign => {
          signRecord.push(_.extend(this.parseUserRecord(sign.data, year, month), {
            user: sign.user
          }));
          members = diffObjectId(members, [sign.user]);
        });
        if (members.length) {
          members.forEach(user => {
            signRecord.push(_.extend(this.parseUserRecord([], year, month), {
              user: user
            }));
          });
        }
        return signRecord;
      });
    })
    .then(record => {
      record.forEach(item => {
        item.user = _.find(company.members, member => member._id.equals(item.user));
        item.user = item.user && _.pick(item.user, '_id', 'name');
      });
      return ({
        page,
        pageSize,
        totalrows,
        list: record
      });
    });
  }
}
