import _ from 'underscore';
import moment from 'moment';
import Promise from 'bluebird';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import { diffObjectId } from 'lib/utils';
import Structure from 'models/structure';
import C from 'lib/constants';

export default class AttendanceRemind {

  doJob() {
    let now = moment().format('HH:mm');
    let temMinuteLater = moment().add(10, 'minute').format('HH:mm');
    db.attendence.setting.find({
      is_open: true,
      time_start: {
        $gt: now,
        $lte: temMinuteLater
      }
    }, {
      time_start: 1
    })
    .then(companys => {
      companys.forEach(company => {

      });
    });
  }

}
