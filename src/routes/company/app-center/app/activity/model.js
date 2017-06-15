import Base from '../../base';
import _ from 'underscore';
import { ApiError } from 'lib/error';
import moment from 'moment';
import { ObjectId } from 'mongodb';
import C from './constants';
import Promise from 'bluebird';


export default class Activity extends Base {

  constructor() {
    super();
    this.baseInfo = {
      name: 1,
      type: 1,
      activity_date: 1,
      activity_start: 1,
      activity_end: 1,
      assistants: 1,
      members: 1,
      content: 1,
      locale_info: 1,
    };
    this.inMember = [
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
    this.all = inMember.concat([{is_public: true}]);
  }

  overview({user_id, company_id}) {
    let now = new Date();
    return Promise.all([
      this.collection('item')
      .find({
        company_id,
        time_end: { $lt: now },
        'room.status': C.APPROVAL_STATUS.AGREED,
        $or: this.isMember
      }, this.baseInfo)
      .limit(C.ACTIVITY_QUERY_LIMIT),
      this.collection('item')
      .find({
        company_id,
        time_start: { $lt: now },
        time_end: { $gt: now },
        'room.status': C.APPROVAL_STATUS.AGREED,
        $or: this.isMember
      }, this.baseInfo)
      .limit(C.ACTIVITY_QUERY_LIMIT),
      this.collection('item')
      .find({
        company_id,
        time_start: { $gt: now },
        'room.status': C.APPROVAL_STATUS.AGREED,
        $or: this.isMember
      }, this.baseInfo)
      .limit(C.ACTIVITY_QUERY_LIMIT),
      this.collection('item')
      .find({
        company_id,
        time_start: { $gt: now },
        'room.status': C.APPROVAL_STATUS.AGREED,
        $or: this.all,
      }, this.baseInfo)
      .limit(C.ACTIVITY_QUERY_LIMIT),
      this.collection('item')
      .find({
        company_id,
        time_start: { $gt: now },
        'room.status': C.APPROVAL_STATUS.AGREED,
        $or: this.all,
      }, this.baseInfo)
      .limit(C.ACTIVITY_QUERY_LIMIT),
      this.collection('item')
      .find({
        company_id,
        time_start: { $gt: now },
        'room.status': C.APPROVAL_STATUS.AGREED,
        $or: this.all,
      }, this.baseInfo)
      .limit(C.ACTIVITY_QUERY_LIMIT),
    ]).then(([past_mine, now_mine, feature_mine, past_all, now_all, feature_all]) => {
      return {
        mine: {
          past: past_mine,
          now: now_mine,
          feature: feature_mine
        },
        all: {
          past: past_all,
          now: now_all,
          feature: feature_all
        }
      };
    });
  }

  list({user_id, company_id, range, target}) {
    let now = new Date();
    return this.collection('item').find({
      company_id,
      time_start: {
        $gte: moment().startOf('day').toDate()
      },
      'room.status': C.APPROVAL_STATUS.AGREED,
      $or: [
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
        {
          is_public: true
        }
      ]
    }, this.baseInfo).then(list => {
      _.map(list, item => {
        item.total = item.assistants.length + item.members.length + 1;
        delete item.assistants;
        delete item.members;
        return item;
      });
      return list;
    });
  }

  detail({user_id, activity_id}) {
    return this.collection('item').findOne({
      _id: activity_id
    }).then(doc => {
      if (!this._checkPermission(doc, user_id)) {
        throw new ApiError(400, 'permission_dined');
      } else {
        return doc;
      }
    });
  }

  accept({ user_id, activity_id}) {
    return this.collection('item').findOne({
      _id: activity_id
    }).then(doc => {
      if (!_.some(doc.members, item => item.equals(user_id))) {
        throw new ApiError(400, 'invalid_user');
      } else {
        return this.collection('item').update({
          _id: activity_id
        }, {
          $push: { accept_members: user_id }
        });
      }
    });
  }

  comment({user_id, activity_id, content}) {
    return this.collection('item').findOne({
      _id: activity_id
    }).then(doc => {
      if (!this._checkPermission(doc, user_id)) {
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
      if
    });
  }

  _checkPermission(doc, user_id) {
    if (doc.is_public) {
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
