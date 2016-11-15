import _ from 'underscore';
import Promise from 'bluebird';

import { ApiError } from 'lib/error';
import db from 'lib/database';

// config
export const APPROVAL = 'approval';
export const ANNOUNCEMENT = 'announcement';
export const COMPANY_MEMBER_INVITE = 'company_member_invite';
export const COMPANY_MEMBER_UPDATE = 'company_member_update';
export const COMPANY_MEMBER_REMOVE = 'company_member_remove';
export const STRUCTURE_MEMBER = 'structure_member';
export const PROJECT_DISCUSSION = 'project_discussion';
export const PROJECT_MEMBER = 'project_member';
export const PROJECT_TRANSFER = 'project_transfer';
export const PROJECT_QUIT = 'project_quit';
export const TASK_ASSIGNED = 'task_assigned';
export const TASK_DAYLYREPORT = 'task_dailyreport';
export const TASK_UPDATE = 'task_update';
export const REQUEST = 'request';
export const SCHEDULE_REMIND = 'schedule_remind';
export const ATTENDANCE = 'attendance';

// config items
export const APPROVAL_ITEM_RESULT = 'approval_item_result';
export const COMPANY_MEMBER_UPDATE_MODIFY = 'company_member_update_modify';
export const COMPANY_MEMBER_UPDATE_SETADMIN = 'company_member_update_setadmin';
export const COMPANY_MEMBER_UPDATE_REMOVEADMIN = 'company_member_update_removeadmin';
export const STRUCTURE_MEMBER_ADD = 'structure_member_add';
export const STRUCTURE_MEMBER_REMOVE = 'structure_member_remove';
export const PROJECT_MEMBER_ADD = 'project_member_add';
export const PROJECT_MEMBER_REMOVE = 'project_member_remove';
export const PROJECT_MEMBER_SETADMIN = 'project_member_setadmin';
export const PROJECT_MEMBER_REMOVEADMIN = 'project_member_removeadmin';
export const REQUEST_ACCEPT = 'request_accept';
export const REQUEST_REJECT = 'request_reject';
export const TASK_REPLY = 'task_reply';


export default class NotificationSetting {

  constructor() {
    this.default = {
      [APPROVAL]: {
        web: { editable: true, default: true },
        wechat: { editable: true, default: true },
        email: { editable: false, default: false },
      },
      [ANNOUNCEMENT]: {
        web: { editable: true, default: true },
        wechat: { editable: false, default: false },
        email: { editable: false, default: false },
      },
      [COMPANY_MEMBER_INVITE]: {
        web: { editable: false, default: true },
        wechat: { editable: false, default: false },
        email: { editable: false, default: true },
      },
      [COMPANY_MEMBER_UPDATE]: {
        web: { editable: true, default: true },
        wechat: { editable: false, default: false },
        email: { editable: false, default: false },
      },
      [COMPANY_MEMBER_REMOVE]: {
        web: { editable: false, default: true },
        wechat: { editable: false, default: false },
        email: { editable: false, default: false },
      },
      [STRUCTURE_MEMBER]: {
        web: { editable: true, default: true },
        wechat: { editable: false, default: false },
        email: { editable: false, default: false },
      },
      [PROJECT_DISCUSSION]: {
        web: { editable: true, default: true },
        wechat: { editable: false, default: false },
        email: { editable: false, default: false },
      },
      [PROJECT_MEMBER]: {
        web: { editable: true, default: true },
        wechat: { editable: false, default: false },
        email: { editable: false, default: false },
      },
      [PROJECT_TRANSFER]: {
        web: { editable: false, default: true },
        wechat: { editable: false, default: false },
        email: { editable: false, default: false },
      },
      [PROJECT_QUIT]: {
        web: { editable: false, default: true },
        wechat: { editable: false, default: true },
        email: { editable: false, default: false },
      },
      [TASK_ASSIGNED]: {
        web: { editable: true, default: true },
        wechat: { editable: true, default: true },
        email: { editable: false, default: false },
      },
      [TASK_DAYLYREPORT]: {
        web: { editable: false, default: false },
        wechat: { editable: true, default: true },
        email: { editable: false, default: false },
      },
      [TASK_UPDATE]: {
        web: { editable: true, default: true },
        wechat: { editable: false, default: false },
        email: { editable: false, default: false },
      },
      [REQUEST]: {
        web: { editable: false, default: true },
        wechat: { editable: true, default: true },
        email: { editable: false, default: false },
      },
      [SCHEDULE_REMIND]: {
        web: { editable: false, default: true },
        wechat: { editable: true, default: false },
        email: { editable: false, default: false },
      },
      [ATTENDANCE]: {
        web: { editable: true, default: true },
        wechat: { editable: true, default: true },
        email: { editable: false, default: false },
      },
    };
    this.map = {
      [APPROVAL_ITEM_RESULT]: APPROVAL,
      [COMPANY_MEMBER_UPDATE_MODIFY]: COMPANY_MEMBER_UPDATE,
      [COMPANY_MEMBER_UPDATE_SETADMIN]: COMPANY_MEMBER_UPDATE,
      [COMPANY_MEMBER_UPDATE_REMOVEADMIN]: COMPANY_MEMBER_UPDATE,
      [STRUCTURE_MEMBER_ADD]: STRUCTURE_MEMBER,
      [STRUCTURE_MEMBER_REMOVE]: STRUCTURE_MEMBER,
      [PROJECT_MEMBER_ADD]: PROJECT_MEMBER,
      [PROJECT_MEMBER_REMOVE]: PROJECT_MEMBER,
      [PROJECT_MEMBER_SETADMIN]: PROJECT_MEMBER,
      [PROJECT_MEMBER_REMOVEADMIN]: PROJECT_MEMBER,
      [REQUEST_ACCEPT]: REQUEST,
      [REQUEST_REJECT]: REQUEST,
      [TASK_REPLY]: TASK_UPDATE,
    };
  }

  mapSetting(type) {
    if (this.default[type]) {
      return type;
    }
    return this.map[type];
  }

  _isOn(type, setting, method) {
    let defaultType = this.default[type] && this.default[type][method];
    if (!defaultType) {
      return false;
    }
    if (!defaultType.editable || !setting) {
      return defaultType.default;
    }
    return _.contains(setting, method);
  }

  getAll(userId) {
    let fetchPromise;
    if (!userId) {
      fetchPromise = Promise.resolve({});
    } else {
      fetchPromise = db.notification.setting.findOne({
        _id: userId
      });
    }
    return fetchPromise.then(doc => {
      doc = doc || {};
      let setting = _.clone(this.default);
      _.each(setting, (item, type) => {
        _.each(item, (v, method) => {
          setting[type][method]['on'] = !!(doc[type] ? this._isOn(type, doc[type], method) : setting[type][method]['default']);
        });
      });
      return setting;
    });
  }

  get(userId, type) {
    type = this.mapSetting(type);
    if (!_.isString(type) || !this.default[type]) {
      throw new ApiError(400, null, `invalid type ${type}`);
    }
    return db.notification.setting.findOne({
      _id: userId
    }, {
      [type]: 1
    })
    .then(doc => {
      let setting = doc && doc[type];
      return {
        web: this._isOn(type, setting, 'web'),
        wechat: this._isOn(type, setting, 'wechat'),
        email: this._isOn(type, setting, 'email'),
      };
    });
  }

  set(userId, type, method, isOn) {
    if (!this.default[type]) {
      return Promise.reject(new ApiError(400, null, `invalid type ${type}`));
    }
    if (isOn === undefined && _.isArray(method)) {
      return this._setMethods(userId, type, method);
    }
    return this._setMethod(userId, type, method, isOn);
  }

  initUserDefaultSetting(userId) {
    if (!userId) {
      return Promise.reject(new ApiError(400, null, 'setDefault notification setting error: empty userId'));
    }
    return this.getAll().then(defaultSetting => {
      let setting = {};
      _.each(defaultSetting, (item, type) => setting[type] = _.map(item, (v, method) => v.default && method).filter(i => i));
      return db.notification.setting.insert(_.extend(setting, {
        _id: userId
      }));
    });
  }

  _setMethods(userId, type, methods) {
    for (let method in methods) {
      if (!this._isOn(type, methods, method)) {
        return Promise.reject(new ApiError(400, null,  'invalid value'));
      }
    }
    return db.notification.setting.update({
      _id: userId
    }, {
      $set: {
        [type]: methods
      }
    }, {
      upsert: true
    });
  }

  _setMethod(userId, type, method, isOn) {
    if (isOn != this._isOn(type, isOn ? [method] : [], method)) {
      return Promise.reject(new ApiError(400,  null, 'invalid value'));
    }
    return this.get(userId, type)
    .then(setting => {
      setting[method] = isOn;
      return db.notification.setting.update({
        _id: userId
      }, {
        $set: {
          [type]: _.keys(_.find(setting, itemOn => itemOn))
        }
      });
    });
  }

  getSettingTypes() {
    return _.keys(this.default);
  }

  getSettingMethods() {
    return _.keys(this.default[this.getSettingTypes()[0]]);
  }

}
