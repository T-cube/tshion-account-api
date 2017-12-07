import _ from 'underscore';
import Promise from 'bluebird';
import moment from 'moment';
import config from 'config';
import { ObjectId } from 'mongodb';

import C from 'lib/constants';
import db from 'lib/database';
import {findObjectIdIndex} from 'lib/utils';

export default class Plan {

  constructor(company_id) {
    this.company_id = company_id;
    this.planInfo = undefined;
  }

  getStatus() {
    let {company_id} = this;
    return this.getPlanInfo()
    .then(planInfo => {
      let paid = _.values(C.TEAMPLAN_PAID);
      let trial = planInfo ? _.difference(paid, _.uniq(_.pluck(planInfo.list, 'plan'))) : paid;
      let current = this._getCurrent(planInfo);
      let certified = planInfo && planInfo.certified && planInfo.certified.plan;
      return {
        company_id,
        current,
        viable: {trial, paid: certified == C.TEAMPLAN.ENT ? paid : (certified ? [certified] : [])},
        certified,
        degrade: planInfo && planInfo.degrade,
      };
    });
  }

  getCurrent(showExpired = false) {
    return this.getPlanInfo().then(planInfo => this._getCurrent(planInfo, showExpired));
  }

  _getCurrent(planInfo, showExpired = true) {
    let current = planInfo
      && planInfo.current
      && _.find(planInfo.list, item => item._id.equals(planInfo.current._id));
    if (current) {
      let now = new Date();
      let expire_days = this._calcExpireDays(now, current.date_end);
      if (expire_days < -7) {
        return _.extend({}, current, {status: C.PLAN_STATUS.ACTIVED}, planInfo.current);
      } else if (expire_days >= -7 && expire_days <= 0) {
        return _.extend({}, current, {status: C.PLAN_STATUS.NEARDUE}, planInfo.current);
      } else if (expire_days > 0 && expire_days <= 7) {
        return _.extend({}, current, {status: C.PLAN_STATUS.OVERDUE}, planInfo.current);
      } else if (expire_days > 7) {
        return _.extend({}, current, {status: C.PLAN_STATUS.EXPIRED}, planInfo.current);
      } else if (showExpired) {
        return _.extend({}, current, {status: C.PLAN_STATUS.EXPIRED}, planInfo.current);
      }
    }
    return {
      plan: C.TEAMPLAN.FREE,
      member_count: 0,
      status: null
    };
  }

  _calcExpireDays(now, expire_date) {
    return moment(now).diff(moment(expire_date), 'days');
  }

  getPlanInfo() {
    let { company_id, planInfo } = this;
    if (planInfo !== undefined) {
      return Promise.resolve(planInfo);
    }
    return db.plan.company.findOne({
      _id: company_id,
    })
    .then(planInfo => {
      this.planInfo = planInfo;
      return planInfo;
    });
  }

  getSetting(type) {
    return db.plan.findOne({type});
  }

  getUpgradeStatus() {
    return this.getCurrent(true)
    .then(current => {
      if (!current || current.type == 'trial' || current.status != C.PLAN_STATUS.ACTIVED) {
        return null;
      }
      let { plan, date_end, member_count } = current;
      let times = moment(date_end).diff(moment().startOf('day'), 'month');
      return {times, plan, member_count};
    });
  }

  createNewTrial(data) {
    let { company_id } = this;
    let { plan, user_id } = data;
    let newId = ObjectId();
    let date_end = moment().startOf('day').add(config.get('plan.trial_times'), 'month').toDate();
    return db.plan.company.update({
      _id: company_id
    }, {
      $set: {
        current: {
          _id: newId,
          plan,
          type: 'trial',
          date_end,
        },
      },
      $push: {
        list: {
          _id: newId,
          user_id,
          plan,
          type: 'trial',
          member_count: 0,
          date_start: moment().startOf('day').toDate(),
          date_end: date_end,
        }
      }
    }, {
      upsert: true
    });
  }

  updatePaidFromOrder(order, transactionId) {
    let { company_id } = this;
    let { plan, order_type, times, date_create, member_count, user_id } = order;
    return this.getPlanInfo().then(planInfo => {
      if (transactionId && planInfo && planInfo.transactions && findObjectIdIndex(planInfo.transactions, transactionId) > -1) {
        return true;
      }

      let current = this._getCurrent(planInfo);
      let {date_end} = current;
      let isActive = current.status == C.PLAN_STATUS.ACTIVED;
      let isRenewalAndSkipMonth = false;

      if (order_type == C.ORDER_TYPE.NEWLY) {
        date_end = moment(date_create).startOf('day').add(times, 'month').toDate();
      } else if (order_type == C.ORDER_TYPE.RENEWAL) {
        isRenewalAndSkipMonth = !isActive && moment().diff(date_end, 'month', true) > 1;
        if (!isRenewalAndSkipMonth) {
          // 正常使用周期内续费
          date_end = moment(date_end).startOf('day').add(times, 'month').toDate();
        } else {
          // 欠费或锁定
          date_end = moment().startOf('day').date(date_end.getDate()).add(times, 'month').toDate();
        }
      }

      let newId = ObjectId();
      let today = moment().startOf('day').toDate();
      let criteria = {_id: company_id};
      let updates = {};

      if (transactionId) {
        _.extend(updates, {
          $addToSet: {
            transactions: transactionId
          }
        });
      }

      if ((order_type == C.ORDER_TYPE.NEWLY && !isActive)
        || (order_type == C.ORDER_TYPE.DEGRADE && plan != C.TEAMPLAN.FREE)
        || isRenewalAndSkipMonth) {
        updates['$set'] = {
          current: {
            _id: newId,
            plan,
            type: 'paid',
            date_end,
          }
        };
        updates['$push'] = {
          list: {
            _id: newId,
            user_id,
            plan,
            type: 'paid',
            member_count,
            date_start: today,
            date_end
          }
        };
      } else if (order_type == C.ORDER_TYPE.DEGRADE && plan == C.TEAMPLAN.FREE) {
        updates['$unset'] = {
          current: 1
        };
      } else if (order_type == C.ORDER_TYPE.UPGRADE
          || (order_type == C.ORDER_TYPE.NEWLY && isActive)) {
        let {list} = planInfo;
        list.forEach(item => {
          if (item._id.equals(current._id)) {
            item.date_end = today;
          }
        });
        list.push({
          _id: newId,
          user_id,
          plan,
          type: 'paid',
          member_count,
          date_start: today,
          date_end
        });
        updates['$set'] = {
          current: {
            _id: newId,
            plan,
            type: 'paid',
            date_end,
          },
          list
        };
      } else if (order_type == C.ORDER_TYPE.RENEWAL && !isRenewalAndSkipMonth) {
        criteria['list._id'] = current._id;
        updates['$set'] = {
          'current.date_end': date_end,
          'list.$.date_end': date_end,
        };
      }

      return db.plan.company.update(criteria, updates, {
        upsert: true
      });
    });
  }

  commitUpdatePaidFromOrder(order, transactionId) {
    let { company_id } = this;
    return db.plan.company.update({
      _id: company_id,
      transactions: transactionId
    }, {
      $pull: {
        transactions: transactionId
      }
    });
  }

  // 清除当前的试用状态，如果之前的计划没有过期，则恢复（这种情况出现在购买专业版且正在使用然后试用企业版）
  cleanTrial() {
    return this._updateTrial({clean: true});
  }

  stopTrial() {
    return this._updateTrial({stop: true});
  }

  _updateTrial({clean = false, stop = false}) {
    return this.getPlanInfo().then(planInfo => {
      let trial = this._getCurrent(planInfo);
      if (!trial || trial.type != 'trial') {
        return;
      }
      let now = new Date();
      let paid = planInfo && _.find(planInfo.list, item => item.date_end > now && item.type == 'paid');
      if (!paid && clean) {
        return;
      }
      let $set = {
        current: paid ? _.pick(paid, '_id', 'plan', 'type', 'date_end') : null,
      };
      if (stop) {
        $set['list.$.date_end'] = now;
      }
      return db.plan.company.update({
        _id: this.company_id,
      }, {$set});
    });
  }

  clearDegrade() {
    let {company_id} = this;
    return db.plan.company.update({
      _id: company_id,
    }, {
      $unset: {
        degrade: 1
      }
    });
  }

}
