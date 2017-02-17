import _ from 'underscore';
import moment from 'moment';
import Promise from 'bluebird';

import db from 'lib/database';
import C from 'lib/constants';
import Attendance from './attendance';
import { ATTENDANCE } from 'models/notification-setting';

export default class AttendanceRemind {

  doJob() {
    const now = moment().startOf('minute');
    this.remindSign(now, 0);
  }

  remindSign(now) {
    let criteria = {
      is_open: true,
      $or: [
        {
          time_start: {
            $gt: moment(now.toDate()).add(5, 'minute').format('HH:mm'),
            $lte: moment(now.toDate()).add(10, 'minute').format('HH:mm')
          }
        },
        {
          time_end: {
            $gt: moment(now.toDate()).subtract(5, 'minute').format('HH:mm'),
            $lte: moment(now.toDate()).format('HH:mm')
          }
        },
      ]
    };
    let year = now.year();
    let month = now.month() + 1;
    let date = now.date();
    let cursor = db.attendance.setting.find(criteria);
    cursor.forEach((err, setting) => {
      if (!setting) {
        return;
      }
      let attendance = new Attendance(setting);
      let companyId = setting._id;
      if (!attendance.isWorkDay(now.format('YYYY-MM-DD'))) {
        return companyId;
      }
      let minuteDiffOfStart = now.diff(new Date(`${year}-${month}-${date} ${setting.time_start}`), 'minute');
      let minuteDiffOfEnd = now.diff(new Date(`${year}-${month}-${date} ${setting.time_end}`), 'minute');
      let signTypes = [];
      if (minuteDiffOfStart >= -10 && minuteDiffOfStart < -5) {
        signTypes.push('sign_in');
      }
      if (minuteDiffOfEnd >= 0 && minuteDiffOfEnd < 5) {
        signTypes.push('sign_out');
      }
      return this._findCompanyMembers(companyId)
      .then(members => {
        return members && Promise.map(members, member => {
          db.attendance.sign.findOne({
            company: companyId,
            user: member._id,
            year,
            month,
            'data.date': date
          }, {
            'data.$': 1
          })
          .then(doc => {
            signTypes.forEach(sign_type => {
              if (!doc || !doc.data[0][sign_type]) {
                this.model('notification').send({
                  to: member._id,
                  action: C.ACTIVITY_ACTION.ATTENDANCE_REMIND,
                  target_type: C.OBJECT_TYPE.ATTENDANCE,
                  company: companyId,
                  company_member: _.pick(member, '_id', 'name'),
                  sign_type,
                }, ATTENDANCE);
              }
            });
          });
        });
      })
      .catch(e => console.error(e));
    });
  }


  _findCompanyMembers(companyId) {
    return db.company.findOne({
      _id: companyId
    }, {
      members: 1
    })
    .then(company => company && company.members);
  }

}
