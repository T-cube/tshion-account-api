import _ from 'underscore';
import config from 'config';
import { ObjectId } from 'mongodb';

import db from 'lib/database';

export default class UserLevel {

  constructor(user) {
    if (ObjectId.isValid(user)) {
      this.setUserId(user);
    } else if (_.isObject(user)) {
      this.setUserInfo(user);
    }
  }

  setUserInfo(user) {
    this.user = user;
    this.userId = user._id;
  }

  setUserId(userId) {
    this.userId = ObjectId(userId);
    this.user = null;
  }

  getLevelInfo() {
    if (!this.userId) {
      return this._rejectWhenMissingCompany();
    }
    return Promise.all([
      db.company.count({
        owner: this.userId
      }),
      this.getLevel()
    ])
    .then(([own_companies, level]) => {
      if (!level) {
        return null;
      }
      let max_own_companies = config.get(`accountLevel.${level}.max_own_companies`);
      return {
        level,
        max_own_companies,
        own_companies,
      };
    });
  }

  canOwnCompany() {
    return this.getLevelInfo()
    .then(info => {
      if (!info) {
        return false;
      }
      return info.max_own_companies > info.own_companies;
    });
  }

  getUserInfo() {
    let user = this.user;
    if (user && user.level) {
      return Promise.resolve(user);
    }
    if (!this.userId) {
      return this._rejectWhenMissingCompany();
    }
    return db.user.findOne({
      _id: this.userId
    })
    .then(user => {
      this.user = user;
      return user;
    });
  }

  getLevel() {
    let user = this.user;
    if (user && user.level) {
      return Promise.resolve(user.level);
    }
    return this.getUserInfo().then(user => user ? (user.level || 'free') : null);
  }

  _rejectWhenMissingCompany() {
    return Promise.reject(new Error('UserLevel: missing user'));
  }

}
