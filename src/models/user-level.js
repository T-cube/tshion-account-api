import config from 'config';
import { ObjectId } from 'mongodb';

import db from 'lib/database';
import { ApiError } from 'lib/error';

export default class UserLevel {

  constructor(user) {
    if (ObjectId.isValid(user)) {
      this.setUserId(user);
    } else {
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

  canCreateCompany() {
    if (!this.userId) {
      return this._rejectWhenMissingCompany();
    }
    return db.company.count({
      owner: this.userId
    })
    .then(num => {
      return this.getLevel().then(level => {
        let max_own_companies = config.get(`accountLevel.${level}.max_own_companies`);
        return num < max_own_companies;
      });
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
    return this.getUserInfo().then(user => user.level || 'free');
  }

  _rejectWhenMissingCompany() {
    return Promise.reject(new ApiError(500, null, 'missing user'));
  }

}
