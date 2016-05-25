import _ from 'underscore';
import moment from 'moment';

export class Attendance {

  constructor(attendanceSetting) {
    this.attendanceSetting = attendanceSetting;
  }

  updateSign(data, user_id, date) {
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
      let recordType = null;
      if (data.type == 'sign_in') {
        if (new Date(`${year}-${month}-${date} ${settings.time_start}`) < now) {
          recordType = 'late';
        }
      } else {
        if (new Date(`${year}-${month}-${date} ${settings.time_end}`) > now) {
          recordType = 'leave_early';
        }
      }
      if (!doc) {
        let update = {
          date: date,
          [data.type]: now,
        }
        recordType && (update[recordType] = true);
        data.patch && (update['patch'] = data.type);
        return db.attendance.sign.update({
          user: user_id,
          year: year,
          month: month,
        }, {
          $push: {
            data: update
          }
        }, {
          upsert: true
        })
      } else {
        if (doc.data[0][data.type]) {
          throw new ApiError(400, null, 'user has signed')
        }
        let update = {
          $set: {['data.$.' + data.type]: now},
        }
        recordType && (update['$set']['data.$.' + recordType] = true);
        data.patch && (update['$push']['patch'] = data.type);
        return db.attendance.sign.update({
          user: user_id,
          year: year,
          month: month,
          'data.date': date,
        }, update)
      }
    })
  }
}

export class AttendanceSetting {

  constructor(setting) {
    this.setting = setting;
  }

  isWorkDay(date) {
    date = new Date(date);
    let weekday = date.getDay();
    date = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
    let setting = this.setting;
    if (_.has(setting.workday_special, date)) {
      return true;
    }
    if (_.has(setting.holiday, date)) {
      return false;
    }
    if (setting.workday && setting.workday.length) {
      return _.has(setting.workday, weekday);
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
    let workday_attend = this.getMonthWorkdayAttendCount(data, year, month);
    let record = {
      normal: 0,
      late: 0,
      leave_early: 0,
      workday_real: data.length,
      workday_all: workday_all,
      extra_work: 0,
      absent: workday_all - workday_attend,
    };
    data.forEach(item => {
      if (item.late) {
        record.late += 1;
      }
      if (item.leave_early) {
        record.leave_early += 1;
      }
      if (!item.late && !item.leave_early) {
        record.normal += 1;
      }
    });
    return record;
  }

  isAuditor(user_id) {
    return this.setting.auditor && this.setting.auditor.equals(user_id);
  }
}
