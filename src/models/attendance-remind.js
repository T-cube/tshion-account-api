import _ from 'underscore';
import moment from 'moment';
import Promise from 'bluebird';

import db from 'lib/database';
import C from 'lib/constants';
import { ATTENDANCE } from 'models/notification-setting';

export default class AttendanceRemind {

  doJob() {
    const now = moment().startOf('minute');
    this.remindSign(now, 0);
  }

  remindSign(now, last_id) {
    let criteria = {
      is_open: true,
      $or: [
        {
          ['time_start']: {
            $gt: now.add(5, 'minute').format('HH:mm'),
            $lte: now.add(10, 'minute').format('HH:mm')
          }
        },
        {
          ['time_end']: {
            $gt: now.subtract(5, 'minute').format('HH:mm'),
            $lte: now.format('HH:mm')
          }
        },
      ]
    };
    if (last_id) {
      criteria._id = {
        $gt: last_id
      };
    }
    now.subtract(10, 'minute'); // subtract 10m added
    let year = now.year();
    let month = now.month() + 1;
    let date = now.date();
    this._findSetting(criteria)
    .then(attendance => {
      if (!attendance) {
        return;
      }
      let minuteDiffOfStart = now.diff(new Date(`${year}-${month}-${date} ${attendance.time_start}`), 'minute');
      let minuteDiffOfEnd = now.diff(new Date(`${year}-${month}-${date} ${attendance.time_end}`), 'minute');
      let signTypes = [];
      if (minuteDiffOfStart >= -10 && minuteDiffOfStart < -5) {
        signTypes.push('sign_in');
      }
      if (minuteDiffOfEnd <= 0 && minuteDiffOfEnd > 5) {
        signTypes.push('sign_out');
      }
      let companyId = attendance._id;
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
      .then(() => companyId)
      .catch(e => {
        console.error(e);
        return companyId;
      });
    })
    .then(last_id => {
      last_id && this.remindSign(now, last_id);
    })
    .catch(e => console.error(e));
  }

  _findSetting(criteria) {
    return db.attendance.setting.findOne(criteria, {
      _id: 1,
      time_start: 1,
      time_end: 1,
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
