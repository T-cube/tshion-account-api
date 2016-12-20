import _ from 'underscore';
import Promise from 'bluebird';
import moment from 'moment';
import config from 'config';
import { ObjectId } from 'mongodb';

import { ApiError } from 'lib/error';
import C from 'lib/constants';
import db from 'lib/database';
import Auth from './auth';
import {indexObjectId} from 'lib/utils';

export default class Plan {

  constructor(company_id) {
    this.company_id = company_id;
    this.planInfo = undefined;
  }

  getStatus() {
    return Promise.all([
      this.getPlanInfo(),
      new Auth(this.company_id).getAuthedPlan()
    ])
    .then(([planInfo, authed]) => {
      let paid = _.values(C.TEAMPLAN_PAID);
      let trial = planInfo ? _.difference(paid, _.uniq(_.pluck(planInfo.list, 'plan'))) : paid;
      let current = this._getCurrent(planInfo);
      return {
        // history,
        current,
        viable: {trial, paid},
        authed,
      };
    });
  }

  getCurrent() {
    return this.getPlanInfo().then(planInfo => this._getCurrent(planInfo));
  }

  _getCurrent(planInfo) {
    let current = planInfo
      && planInfo.current
      && _.find(planInfo.list, item => item._id.equals(planInfo.current._id));
    if (current) {
      if (current.date_end > new Date()) {
        return _.extend({}, current, {status: C.PLAN_STATUS.ACTIVED});
      } else if (moment().diff(current.date_end, 'days') < config.get('plan.expire_days')) {
        return _.extend({}, current, {status: C.PLAN_STATUS.OVERDUE});
      } else {
        return _.extend({}, current, {status: C.PLAN_STATUS.EXPIRED});
      }
    }
    return {
      plan: C.TEAMPLAN.FREE,
      member_count: 0,
    };
  }

  getPlanInfo() {
    let { company_id, planIonfo } = this;
    if (planIonfo !== undefined) {
      return Promise.resolve(planIonfo);
    }
    return db.plan.company.findOne({
      _id: company_id,
    });
  }

  getUpgradeStatus() {
    return this.getCurrent()
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
    return db.plan.company.update({
      _id: company_id
    }, {
      $set: {
        current: {
          _id: newId,
          plan,
          type: 'trial',
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
          date_end: moment().startOf('day').add(config.get('plan.trial_times'), 'month').toDate(),
        }
      }
    });
  }

  updatePaidFromOrder(order, transactionId) {
    let { company_id } = this;
    let { plan, order_type, times, date_create, member_count, user_id } = order;
    return this.getPlanInfo().then(planInfo => {
      if (planInfo && planInfo.transactions && indexObjectId(planInfo.transactions, transactionId) > -1) {
        return true;
      }
      let current = this._getCurrent(planInfo);
      let {date_start, date_end} = current;
      date_start = moment(date_start).startOf('day').toDate();
      if (order_type == C.ORDER_TYPE.NEWLY) {
        date_end = moment(date_create).startOf('day').add(times, 'month').toDate();
      } else if (order_type == C.ORDER_TYPE.RENEWAL) {
        date_end = moment(date_end).startOf('day').add(times, 'month').toDate();
      } else if (order_type == C.ORDER_TYPE.PATCH) {
        date_end = moment(date_start).startOf('day').month(new Date().getMonth() + 1).toDate();
      }
      let newId = ObjectId();
      let criteria;
      let updates = {
        $set: {
          current: {
            _id: newId,
            plan,
            type: 'paid',
          }
        },
        $addToSet: {
          transactions: transactionId
        },
      };
      if (order_type == C.ORDER_TYPE.NEWLY || order_type == C.ORDER_TYPE.PATCH) {
        criteria = {
          _id: company_id,
        };
        updates['$push'] = {
          list: {
            _id: newId,
            user_id,
            plan,
            type: 'paid',
            member_count,
            date_start,
            date_end
          }
        };
      } else if (order_type == C.ORDER_TYPE.UPGRADE || order_type == C.ORDER_TYPE.DEGRADE) {
        criteria = {
          _id: company_id,
        };
        let {list} = planInfo;
        list.forEach(item => {
          if (item._id.equals(current._id)) {
            item.date_end = moment().startOf('day').toDate();
          }
        });
        list.push({
          _id: newId,
          user_id,
          plan,
          type: 'paid',
          member_count,
          date_start: moment().startOf('day').toDate(),
          date_end
        });
        updates['$set'].list = list;
      } else if (order_type == C.PLAN_STATUS.PATCH) {
        criteria = {
          _id: company_id,
          'list._id': current._id,
        };
        updates['$set']['list.$.date_start'] = date_start;
        updates['$set']['list.$.date_end'] = date_end;
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

  static getSetting(type) {
    return db.plan.findOne({type});
  }

  static list() {
    return Promise.all([
      db.plan.find(),
      db.payment.product.find()
    ])
    .then(([plans, products]) => {
      plans.forEach(plan => {
        plan.products = _.filter(products, product => product.plan == plan.type);
      });
      return plans;
    });
  }

}
