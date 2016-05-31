import _ from 'underscore';
import moment from 'moment';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import C from 'lib/constants';

export default class Attendance {

  constructor(attendanceSetting) {
    this.setting = attendanceSetting;
  }

  updateSign(data, user_id, isPatch) {
    let { date } = data;
    data = data.data;
    let now = date ? new Date(date) : new Date();
    date = now.getDate();
    let month = now.getMonth() + 1;
    let year = now.getFullYear();
    return db.attendance.sign.findOne({
      user: user_id,
      year: year,
      month: month,
      'data.date': date,
    }, {
      time_start: 1,
      time_end: 1,
      'data.$.': 1
    })
    .then(doc => {
      let settings = this.attendanceSetting;
      let update = this._parseSignData(data, `${year}-${month}-${date}`, doc, isPatch);
      if (!doc) {
        return db.attendance.sign.update({
          user: user_id,
          year: year,
          month: month,
        }, update, {
          upsert: true
        })
      } else {
        data.forEach(item => {
          if (doc.data[0][item.type]) {
            throw new ApiError(400, null, 'user has signed')
          }
        })
        return db.attendance.sign.update({
          user: user_id,
          year: year,
          month: month,
          'data.date': date,
        }, update)
      }
    })
  }

  _parseSignData(data, date, docExist, isPatch) {
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
    })
    let patch = data.map(i => i.type);
    if (!docExist) {
      let update = {
        date: new Date(date).getDate(),
      }
      data.forEach(item => {
        update[item.type] = item.date;
      })
      isPatch && (update.patch = patch);
      recordType.forEach(type => update[type] = true);
      update = {
        $push: {
          data: update
        }
      }
      return update;
    } else {
      let update = {};
      recordType.forEach(type => update['data.$.' + type] = true);
      data.forEach(item => {
        update['data.$.' + item.type] = item.date;
      })
      if (isPatch) {
        let existPatch = docExist.data[0].patch;
        if (existPatch && existPatch.length) {
          patch = patch.concat(existPatch);
        }
        update['data.$.patch'] = patch;
      }
      update = {
        $set: update
      }
      return update;
    }
  }

  isWorkDay(date) {
    date = new Date(date);
    let weekday = date.getDay();
    date = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
    let setting = this.setting;
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
      : moment([year, month, 1]).subtract(1, 'day').getDate();
    let firstWeekday = moment([year, month - 1, 1]).toDate().getDay();
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
      if (item.late) {
        record.late += 1;
      }
      if (item.leave_early) {
        record.leave_early += 1;
      }
      if (!item.sign_in) {
        record.no_sign_in += 1;
      }
      if (!item.sign_out) {
        record.no_sign_out += 1;
      }
      if (!item.late && !item.leave_early && item.sign_in && item.sign_out) {
        record.normal += 1;
      }
      if (item.patch && item.patch.length) {
        record.patch += 1;
      }
    });
    return record;
  }

  isAuditor(user_id) {
    return this.setting.auditor && this.setting.auditor.equals(user_id);
  }

  static audit(audit_id, status) {
    return db.attendance.audit.findAndModify({
      query: {
        _id: audit_id,
        status: C.ATTENDANCE_AUDIT_STATUS.PENDING,
      },
      update: {
        $set: {
          status: status
        }
      }
    })
    .then(audit => {
      console.log('audit', audit);
      if (!audit || status != C.ATTENDANCE_AUDIT_STATUS.APPROVED) {
        return;
      }
      audit = audit.value;
      return db.attendance.setting.findOne({
        company: audit.company,
        // is_open: true,
      })
      .then(setting => {
        console.log('setting', setting);
        if (!setting) {
          return;
        }
        return new Attendance(setting).updateSign({
          data: audit.data,
          date: audit.date,
        }, audit.user, true)
      })
    })
  }
}
