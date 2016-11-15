import _ from 'underscore';
import moment from 'moment';
import Promise from 'bluebird';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import C from 'lib/constants';
import { ATTENDANCE } from 'models/notification-setting';

export default class AttendanceRemind {

  doJob() {
    let fiveMinuteLater = moment().add(5, 'minute').format('HH:mm');
    let tenMinuteLater = moment().add(10, 'minute').format('HH:mm');
    this.remindSignIn([fiveMinuteLater, tenMinuteLater], 0);
    this.remindSignOut([fiveMinuteLater, tenMinuteLater], 0);
  }

  remindSignIn(timeRange, last_id) {
    return this.remindSign(timeRange, last_id, 'sign_in');
  }

  remindSignOut(timeRange, last_id) {
    return this.remindSign(timeRange, last_id, 'sign_out');
  }

  remindSign(timeRange, last_id, sign_type) {
    let [from, to] = timeRange;
    let criteria = {
      is_open: true,
      [sign_type == 'sign_in' ? 'time_start': 'time_end']: {
        $gt: from,
        $lte: to
      }
    };
    if (last_id) {
      criteria._id = {
        $gt: last_id
      };
    }
    let today = moment();
    let year = today.year();
    let month = today.month() + 1;
    let day = today.date();
    this._findSetting(criteria)
    .then(attendance => {
      if (!attendance) {
        return;
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
            'data.date': day
          }, {
            'data.$': 1
          })
          .then(doc => {
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
      })
      .then(() => companyId)
      .catch(e => {
        console.error(e);
        return companyId;
      });
    })
    .then(last_id => {
      last_id && this.remindSignIn(timeRange, last_id);
    })
    .catch(e => console.error(e));
  }

  _findSetting(criteria) {
    return db.attendance.setting.findOne(criteria, {
      _id: 1
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
