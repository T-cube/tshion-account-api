import _ from 'underscore';
import Promise from 'bluebird';
import { ObjectId } from 'mongodb';

import AppBase from 'models/app-base';
import { ApiError } from 'lib/error';
import C from './constants';

export default class Activity extends AppBase {

  constructor(options) {
    super(options);
    this.baseInfo = {
      name: 1,
      type: 1,
      activity_start: 1,
      activity_end: 1,
      assistants: 1,
      members: 1,
      accept_require: 1,
      accept_members: 1,
      content: 1,
      locale_info: 1,
    };
  }

  overview({user_id, company_id}) {
    let isMember = [
      {
        creator: user_id
      },
      {
        assistants: user_id
      },
      {
        followers: user_id
      },
      {
        members: user_id
      },
    ];
    let all = isMember.concat([{is_public: true}]);
    let now = new Date();
    return Promise.all([
      this.collection('item')
      .find({
        company_id,
        time_end: { $lt: now },
        'room.status': C.APPROVAL_STATUS.AGREED,
        $or: isMember
      }, this.baseInfo)
      .limit(C.ACTIVITY_QUERY_LIMIT),
      this.collection('item')
      .find({
        company_id,
        time_start: { $lt: now },
        time_end: { $gt: now },
        'room.status': C.APPROVAL_STATUS.AGREED,
        $or: isMember
      }, this.baseInfo)
      .limit(C.ACTIVITY_QUERY_LIMIT),
      this.collection('item')
      .find({
        company_id,
        time_start: { $gt: now },
        'room.status': C.APPROVAL_STATUS.AGREED,
        $or: isMember
      }, this.baseInfo)
      .limit(C.ACTIVITY_QUERY_LIMIT),
      this.collection('item')
      .find({
        company_id,
        time_start: { $gt: now },
        'room.status': C.APPROVAL_STATUS.AGREED,
        $or: all,
      }, this.baseInfo)
      .limit(C.ACTIVITY_QUERY_LIMIT),
      this.collection('item')
      .find({
        company_id,
        time_start: { $gt: now },
        'room.status': C.APPROVAL_STATUS.AGREED,
        $or: all,
      }, this.baseInfo)
      .limit(C.ACTIVITY_QUERY_LIMIT),
      this.collection('item')
      .find({
        company_id,
        time_start: { $gt: now },
        'room.status': C.APPROVAL_STATUS.AGREED,
        $or: all,
      }, this.baseInfo)
      .limit(C.ACTIVITY_QUERY_LIMIT),
    ]).then(([past_mine, now_mine, feature_mine, past_all, now_all, feature_all]) => {
      return {
        mine: {
          past: this._listCalc(past_mine),
          now: this._listCalc(now_mine),
          feature: this._listCalc(feature_mine)
        },
        all: {
          past: this._listCalc(past_all),
          now: this._listCalc(now_all),
          feature: this._listCalc(feature_all)
        }
      };
    });
  }

  list({user_id, company_id, range, target}) {
    let isMember = [
      {
        creator: user_id
      },
      {
        assistants: user_id
      },
      {
        followers: user_id
      },
      {
        members: user_id
      },
    ];
    let all = isMember.concat([{is_public: true}]);
    let now = new Date();
    let criteria = {
      company_id,
      'room.status': C.APPROVAL_STATUS.AGREED,
    };
    if (range == C.LIST_RANGE.PAST) {
      criteria.time_end = { $lt: now };
    } else if (range == C.LIST_RANGE.NOW) {
      criteria.time_start = { $lt: now };
      criteria.time_end = { $gt: now };
    } else {
      criteria.time_start = { $gt: now };
    }
    if (target == C.LIST_TARGET.MINE) {
      criteria['$or'] = isMember;
    } else {
      criteria['$or'] = all;
    }
    return this.collection('item')
    .find(criteria, this.baseInfo)
    .then(list => {
      return this._listCalc(list);
    });
  }

  detail({user_id, activity_id}) {
    return this.collection('item').findOne({
      _id: activity_id
    }).then(doc => {
      if (!this._checkReadPermission(doc, user_id)) {
        throw new ApiError(400, 'permission_dined');
      } else {
        return doc;
      }
    });
  }

  signIn({user_id, activity_id}) {
    return this.collection('item').findOne({
      _id: activity_id
    }).then(doc => {
      if (!doc.sign_in_require || !_.some(doc.assistants.concat(doc.creator, doc.members, doc.followers), item => item.equals(user_id))) {
        throw new ApiError(400, 'invalid_sign_in');
      } else {
        return this.collection('item').update({
          _id: activity_id
        }, {
          $addToSet: { sign_in_members: user_id }
        });
      }
    });
  }

  signUp({user_id, activity_id}) {
    return this.collection('item').findOne({
      _id: activity_id
    }).then(doc => {
      if (doc.is_member_certified) {
        throw new ApiError(400, 'invalid_sign_up');
      } else {
        return this.collection('item').update({
          _id: activity_id
        }, {
          $addToSet: { members: user_id }
        });
      }
    });
  }

  accept({ user_id, activity_id}) {
    return this.collection('item').findOne({
      _id: activity_id
    }).then(doc => {
      if (!doc.accept_require || !_.some(doc.members, item => item.equals(user_id))) {
        throw new ApiError(400, 'invalid_accept');
      } else {
        return this.collection('item').update({
          _id: activity_id
        }, {
          $addToSet: { accept_members: user_id }
        });
      }
    });
  }

  comment({user_id, activity_id, content}) {
    return this.collection('item').findOne({
      _id: activity_id
    }).then(doc => {
      if (!_.some(doc.assistants.concat(doc.creator, doc.members, doc.followers), item => item.equals(user_id))) {
        throw new ApiError(400, 'permission_dined');
      } else {
        return this.collection('item').update({
          _id: activity_id
        }, {
          $push: {
            comments: {
              _id: ObjectId(),
              user_id,
              content,
            }
          }
        }).then(doc => {
          return doc;
        });
      }
    });
  }

  createActivity(activity) {
    return this.collection('room').findOne({
      _id: activity.room._id
    }).then(doc => {
      if (!doc) {
        throw new ApiError(400, 'invalid_room_id');
      }
      activity.accept_members = [];
      activity.sign_in_members = [];
      activity.room.comments = [];
      activity.comments = [];
      activity.date_create = new Date();
      activity.date_update = new Date();
      if (!doc.approval) {
        activity.room.status = C.APPROVAL_STATUS.AGREED;
      } else {
        activity.root.status = C.APPROVAL_STATUS.PENDING;
      }
      return this.collection('item')
      .insert(activity)
      .then(doc => {
        return doc;
      });
    });
  }

  approval({user_id, activity_id, content}) {
    return this.collection('item').findOne({
      _id: activity_id
    }).then(doc => {
      if (!doc) {
        throw new ApiError(400, 'no_approval');
      }
      this.collection('item')
      .update({
        _id: activity_id
      }, {
        $push: { comments: {
          _id: ObjectId(),
          user_id,
          content,
          date_create: new Date()
        } }
      });
    });
  }

  _listCalc(list) {
    return _.map(list, item => {
      item.total = item.assistants.length + item.members.length + 1;
      delete item.assistants;
      delete item.members;
      return item;
    });
  }

  _checkReadPermission(doc, user_id) {
    if (doc.is_public || !doc.is_member_certified) {
      return true;
    }
    if (_.some(doc.assistants.concat(doc.followers, doc.creator), item => item.equals(user_id))) {
      return true;
    }
    if (doc.accept_require) {
      if (!_.some(doc.accept_members, item  => item.equals(user_id))) {
        return false;
      } else {
        return true;
      }
    } else {
      if (!_.some(doc.members, item => item.equals(user_id))) {
        return false;
      } else {
        return true;
      }
    }
  }

}
