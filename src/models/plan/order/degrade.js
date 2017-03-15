import _ from 'underscore';
import Promise from 'bluebird';
import moment from 'moment';

import C from 'lib/constants';
import db from 'lib/database';
import Base from './base';

export default class DegradeOrder extends Base {

  constructor(props) {
    super(props);
    this.times = undefined;
    this.order_type = C.ORDER_TYPE.DEGRADE;
    this.status = C.ORDER_STATUS.SUCCEED;
  }

  init({member_count, plan}) {
    this.plan = plan;
    this.member_count = plan == C.TEAMPLAN.FREE ? 0 : member_count;
    let {current} = this.getPlanStatus();
    this.original_plan = current.plan;
    return Promise.resolve();
  }

  save() {
    return super.save().then(order => {
      let {current} = this.getPlanStatus();
      let {company_id, date_create} = this;
      db.plan.company.update({
        _id: company_id,
      }, {
        $set: {
          degrade: {
            order: _.pick(order, '_id', 'plan', 'member_count'),
            time: current.date_end - new Date() > 0 ? current.date_end : new Date(),
            date_create,
          }
        }
      });
      return order;
    });
  }

  isValid() {
    let {current, viable} = this.getPlanStatus();
    let times = this.getTimes();
    return this.getLimits()
    .then(({member_count}) => {
      let error = [];
      let isValid = true;
      if (!current || current.plan == C.TEAMPLAN.FREE || times <= 0) {
        isValid = false;
        error.push('invalid_plan_status');
      }
      if (this.member_count < member_count.min || this.member_count > member_count.max) {
        isValid = false;
        error.push('invalid_member_count');
      }
      if (this.plan != C.TEAMPLAN.FREE) {
        if (!_.contains(viable.paid, this.plan)) {
          isValid = false;
          error.push('plan_not_certified');
        }
        if (this.plan == current.plan && this.member_count == member_count.max) {
          isValid = false;
          error.push('eq_current_status');
        }
        if (this.member_count != current.member_count && this.plan != current.plan) {
          isValid = false;
          error.push('cannot_update_multi');
        }
      }
      return {isValid, error};
    });
  }

  getLimits() {
    let {plan, company_id, limits} = this;
    if (limits) {
      return Promise.resolve(limits);
    }
    return this.getCompanyLevelStatus()
    .then(companyLevelStatus => {
      let {setting, planInfo, levelInfo} = companyLevelStatus;
      if (this.plan == C.TEAMPLAN.FREE) {
        this.limits = {
          member_count: {
            min: 0,
            max: 0,
          }
        };
      } else {
        let minMember = levelInfo.member.count - setting.default_member;
        this.limits = {
          member_count: {
            min: minMember > 0 ? minMember : 0,
            max: planInfo.member_count || 0,
          }
        };
      }
      return this.limits;
    });
  }

  getTimes() {
    let {current} = this.getPlanStatus();
    let times;
    if (!current || !current.date_end) {
      times = 0;
    } else {
      if (current.type == 'trial') {
        times = 1;
        return;
      }
      times = moment(current.date_end).diff(moment().startOf('day'), 'month', true);
    }
    this.setTimes(times > 0 ? (Math.round(times * 100) / 100) : times);
    return this.times;
  }

}
