import _ from 'underscore';
import Promise from 'bluebird';
import { ObjectId } from 'mongodb';
import moment from 'moment';

import AppBase from 'models/app-base';
import { ApiError } from 'lib/error';
import C from './constants';

export default class Activity extends AppBase {

  constructor(options) {
    super(options);
    this.baseInfo = {
      name: 1,
      type: 1,
      time_start: 1,
      time_end: 1,
      departments: 1,
      assistants: 1,
      status: 1,
      members: 1,
      accept_require: 1,
      accept_members: 1,
      content: 1,
      room: 1,
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
        status: C.ACTIVITY_STATUS.CREATED,
        $or: isMember
      }, this.baseInfo)
      .limit(C.ACTIVITY_QUERY_LIMIT),
      this.collection('item')
      .find({
        company_id,
        time_start: { $lt: now },
        time_end: { $gt: now },
        status: C.ACTIVITY_STATUS.CREATED,
        $or: isMember
      }, this.baseInfo)
      .limit(C.ACTIVITY_QUERY_LIMIT),
      this.collection('item')
      .find({
        company_id,
        time_start: { $gt: now },
        status: C.ACTIVITY_STATUS.CREATED,
        $or: isMember
      }, this.baseInfo)
      .limit(C.ACTIVITY_QUERY_LIMIT),
      this.collection('item')
      .find({
        company_id,
        time_end: { $lt: now },
        status: C.ACTIVITY_STATUS.CREATED,
        $or: all,
      }, this.baseInfo)
      .limit(C.ACTIVITY_QUERY_LIMIT),
      this.collection('item')
      .find({
        company_id,
        time_start: { $lt: now },
        time_end: { $gt: now },
        status: C.ACTIVITY_STATUS.CREATED,
        $or: all,
      }, this.baseInfo)
      .limit(C.ACTIVITY_QUERY_LIMIT),
      this.collection('item')
      .find({
        company_id,
        time_start: { $gt: now },
        status: C.ACTIVITY_STATUS.CREATED,
        $or: all,
      }, this.baseInfo)
      .limit(C.ACTIVITY_QUERY_LIMIT),
    ]).then(([past_mine, now_mine, feature_mine, past_all, now_all, feature_all]) => {
      return {
        mine: {
          past: this._listCalc(past_mine, user_id),
          now: this._listCalc(now_mine, user_id),
          feature: this._listCalc(feature_mine, user_id)
        },
        all: {
          past: this._listCalc(past_all, user_id),
          now: this._listCalc(now_all, user_id),
          feature: this._listCalc(feature_all, user_id)
        }
      };
    });
  }

  list({user_id, company_id, date_start, date_end, target, last_id}) {
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
    let criteria = {
      company_id,
      status: { $ne: C.ACTIVITY_STATUS.CANCELLED },
    };
    let sortType = -1;
    if (date_start && !date_end) {
      criteria.time_start = { $gte: date_start};
      sortType = 1;
    } else if (!date_start && date_end) {
      criteria.time_start = { $lte: date_end };
    } else if (date_start && date_end) {
      criteria.time_start = { $gte: date_start, $lte: date_end };
      sortType = 1;
    }
    if (last_id) {
      criteria._id = { $lt: last_id };
    }
    if (target == C.LIST_TARGET.MINE) {
      criteria['$or'] = isMember;
    } else {
      criteria['$or'] = all;
    }
    return this.collection('item')
    .find(criteria, this.baseInfo)
    .limit(10)
    .sort({time_start: sortType})
    .then(list => {
      return this._listCalc(list, user_id);
    });
  }

  createActivity({activity, user_id, company_id}) {
    return this.collection('room').findOne({
      _id: activity.room._id
    }).then(room => {
      if (!room) {
        throw new ApiError(400, 'invalid_room_id');
      }
      activity.accept_members = [];
      activity.sign_in_members = [];
      activity.comments = [];
      activity.creator = user_id;
      activity.date_create = new Date();
      activity.date_update = new Date();
      if (!room.approval_require) {
        activity.status = C.ACTIVITY_STATUS.CREATED;
        return this.collection('item')
        .insert(activity)
        .then(doc => {
          return doc;
        });
      } else {
        activity.status = C.ACTIVITY_STATUS.APPROVING;
        return this.collection('approval').insert({
          room_id: activity.room._id,
          creator: user_id,
          type: room.name,
          company_id,
          manager: room.manager,
          status: C.APPROVAL_STATUS.PENDING,
          comments: []
        })
        .then(approval => {
          activity.room.approval_id = approval._id;
          return this.collection('item')
          .insert(activity)
          .then(doc => {
            this.collection('approval')
            .update({
              _id: approval._id
            }, {
              $set: {
                activity_id: doc._id
              }
            });
            return doc;
          });
        });
      }
    });
  }

  changeActivity({activity_id, activity, user_id, company_id}) {
    return this.collection('item')
    .findOne({
      _id: activity_id,
      creator: user_id,
      company_id,
    })
    .then(doc => {
      if (!doc) {
        throw new ApiError(401, 'invalid_activity_id');
      }
      if (activity.room && !activity.room._id.equals(doc.room._id)) {
        return this.collection('room')
        .findOne({
          _id: activity.room._id
        })
        .then(room => {
          return this.collection('approval').insert({
            room_id: activity.room._id,
            creator: user_id,
            type: room.name,
            company_id,
            manager: room.manager,
            status: C.APPROVAL_STATUS.PENDING,
            comments: []
          });
        })
        .then(approval => {
          activity.room.approval_id = approval._id;
          return this.collection('item')
          .update({
            _id: activity_id
          }, {
            $set: activity
          });
        })
        .then(newActivity => {
          return newActivity;
        });
      } else {
        return this.collection('item')
        .update({
          _id: activity_id
        }, {
          $set: activity
        });
      }
    });
  }

  detail({user_id, activity_id}) {
    return this.collection('item').findOne({
      _id: activity_id
    }).then(doc => {
      if (!doc) {
        throw new ApiError(400, 'invalid_activity');
      }
      if (!this._checkReadPermission(doc, user_id)) {
        throw new ApiError(400, 'not_member');
      } else {
        return doc;
      }
    });
  }

  signIn({user_id, activity_id}) {
    return this.collection('item').findOne({
      _id: activity_id
    }).then(doc => {
      if (!doc) {
        throw new ApiError(400, 'invalid_activity');
      }
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

  signUp({user_id, company_id, activity_id}) {
    return this.collection('item').findOne({
      _id: activity_id,
      company_id,
    }).then(doc => {
      if (!doc) {
        throw new ApiError(400, 'invalid_activity');
      }
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
      if (!doc) {
        throw new ApiError(400, 'invalid_activity');
      }
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
      if (!doc) {
        throw new ApiError(400, 'invalid_activity');
      }
      if (!_.some(doc.assistants.concat(doc.creator, doc.members, doc.followers), item => item.equals(user_id))) {
        throw new ApiError(400, 'not_member');
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


  approvalList({user_id, page, pagesize}) {
    let criteria = {
      $or: [
        {
          creator: user_id
        },
        {
          manager: user_id
        }
      ]
    };
    return this.collection('approval')
    .find(criteria)
    .skip((page - 1) * pagesize)
    .limit(pagesize)
    .then(list => {
      return list;
    });
  }

  approvalDetail({approval_id, user_id}) {
    return this.collection('approval')
    .findOne({
      _id: approval_id
    })
    .then(approval => {
      if (!approval) {
        throw new ApiError(400, 'no_approval');
      }
      if (!approval.creator.equals(user_id) || !approval.manager.equals(user_id)) {
        throw new ApiError(400, 'can_not_get_detail');
      }
      return this.collection('item')
      .findOne({
        _id: approval.activity_id
      }, {
        comments: 0,
        attachments: 0,
      })
      .then(activity => {
        if (!activity) {
          throw new ApiError(400, 'no_activity');
        }
        approval.activity = activity;
        return approval;
      });
    });
  }

  approvalComment({user_id, approval_id, content}) {
    return this.collection('approval').findOne({
      _id: approval_id
    }).then(doc => {
      if (!doc) {
        throw new ApiError(400, 'no_approval');
      }
      if (!doc.creator.equals(user_id) || !doc.room.manager.equals(user_id)) {
        throw new ApiError(400, 'can_not_comment');
      }
      return this.collection('approval')
      .update({
        _id: approval_id
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

  activityConfirm({user_id, approval_id, status}) {
    return this.collection('approval').findOne({
      _id: approval_id
    }).then(doc => {
      if (!doc) {
        throw new ApiError(400, 'no_approval');
      }
      if (!doc.room.manager.equals(user_id)) {
        throw new ApiError(400, 'unable_to_confirm');
      }
      let activity_status;
      if (status == C.APPROVAL_STATUS.AGREED) {
        activity_status = C.ACTIVITY_STATUS.CREATED;
      } else {
        activity_status = C.ACTIVITY_STATUS.APPROVING;
      }
      return Promise.all([
        this.collection('item').update({
          'room.approval_id': approval_id,
        }, {
          $set: { status: activity_status }
        }),
        this.collection('approval').update({
          _id: approval_id
        }, {
          $set: { status: status }
        })
      ]).then(([activity, approval]) => {
        return activity;
      });
    });
  }

  cancel({user_id, activity_id}) {
    return this.collection('item').findOne({
      _id: activity_id
    })
    .then(activity => {
      if (!activity) {
        throw new ApiError(400, 'no_approval');
      }
      if (!activity.creator.equals(user_id)) {
        throw new ApiError(400, 'unable_to_cancel');
      }
      return this.collection('item')
      .update({
        _id: activity_id
      }, {
        $set: {
          status: C.ACTIVITY_STATUS.CANCELLED
        }
      });
    });
  }

  createRoom({room, company_id}) {
    room.company_id = company_id;
    room.date_create = new Date();
    room.date_update = new Date();
    _.map(room.equipments, equipment => {
      equipment._id = ObjectId();
      return equipment;
    });
    return this.collection('room')
    .insert(room);
  }

  removeRoom({room_id, user_id}) {
    return this.collection('room')
    .findOne({
      _id: room_id
    })
    .then(room => {
      if (!room) {
        throw new ApiError(400, 'invalid_room');
      }
      if (!room.manager.equals(user_id)) {
        throw new ApiError(400, 'not_manager_can_not_delete');
      }
      return this.collection('room').remove({_id: room_id});
    });
  }

  listRoom({company_id}) {
    return this.collection('room')
    .find({
      company_id,
    })
    .then(list => {
      return Promise.map(list, item => {
        return this.collection('item').find({
          time_start: { $gte: moment().startOf('day').toDate() }
        })
        .limit(C.ACTIVITY_QUERY_LIMIT)
        .then(activities => {
          item.activities = activities;
          return item;
        });
      }).then(rooms => {
        return rooms;
      });
    });
  }

  roomDetail({company_id, room_id}) {
    return this.collection('room')
    .findOne({
      _id: room_id,
      company_id,
    })
    .then(room => {
      if (!room) {
        throw new ApiError(400, 'invalid_room');
      }
      return Promise.all([
        this.collection('item')
        .find({
          'room._id': room_id,
          time_start: { $lt: moment().startOf('day').toDate() }
        })
        .limit(C.ACTIVITY_QUERY_LIMIT),
        this.collection('item')
        .find({
          'room._id': room_id,
          time_start: {
            $gt: moment().startOf('day').toDate(),
            $lt: moment().startOf('day').add(1, 'day').toDate(),
          },
        }),
        this.collection('item')
        .find({
          'room._id': room_id,
          time_start: { $gte: moment().startOf('day').add(1, 'day').toDate() }
        })
        .limit(C.ACTIVITY_QUERY_LIMIT)
      ]).then(([past, now, future]) => {
        room.past = past;
        room.now = now;
        room.future = future;
        return room;
      });
    });
  }

  changeRoom({room_id, room, user_id}) {
    return this.collection('room')
    .findOne({
      _id: room_id
    })
    .then(doc => {
      if (!doc) {
        throw new ApiError(400, 'invalid_room');
      }
      if (!doc.manager.equals(user_id)) {
        throw new ApiError(400, 'no_change_room_permission');
      }
      return this.collection('room')
      .update({
        _id: room_id
      }, {
        $set: room
      });
    });
  }

  addEquipment({room_id, user_id, equipment}) {
    return this.collection('room')
    .findOne({
      _id: room_id
    })
    .then(room => {
      if (!room) {
        throw new ApiError(400, 'invalid_room');
      }
      if (!room.manager.equals(user_id)) {
        throw new ApiError(400, 'no_change_room_permission');
      }
      let equipmentList = _.map(room.equipments, item => {
        return item.name;
      });
      if (_.some(equipmentList, item => item == equipment.name)) {
        throw new ApiError(400, 'have_same_name_equipment');
      }
      let _id = ObjectId();
      return this.collection('room')
      .update({
        _id: room_id
      }, {
        $push: { equipments: {
          _id,
          name: equipment.name,
          optional: equipment.optional
        }
      }
      })
      .then(() => {
        return {
          _id,
          name: equipment.name,
          optional: equipment.optional,
        };
      });
    });
  }

  deleteEquipment({room_id, user_id, equipment_id}) {
    return this.collection('room')
    .findOne({
      _id: room_id
    })
    .then(room => {
      if (!room.manager.equals(user_id)) {
        throw new ApiError(400, 'no_change_room_permission');
      }
      return this.collection('room')
      .update({
        _id: room_id
      }, {
        $pull: { equipments: {_id: equipment_id} }
      });
    });
  }

  changeRoomEquipment({room_id, equipment_id, user_id, equipment}) {
    return this.collection('room')
    .findOne({
      _id: room_id
    })
    .then(room => {
      if (!room) {
        throw new ApiError(400, 'invalid_room');
      }
      if (!room.manager.equals(user_id)) {
        throw new ApiError(400, 'no_change_room_permission');
      }
      return this.collection('room')
      .update({
        _id: room_id,
        'equipments._id': equipment_id
      }, {
        $set: {
          'equipments.$': equipment
        }
      })
      .then(() => {
        return {
          _id: equipment_id,
          ...equipment
        };
      });
    });
  }

  _listCalc(list, user_id) {
    return _.map(list, item => {
      item.total = item.assistants.length + item.members.length + 1;
      item.isMember = _.some([].concat(item.assistants, item.creator, item.followers, item.members), member => member.equals(user_id));
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
