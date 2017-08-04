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
      attachments: 0,
      comments: 0,
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
    let all = [].concat(isMember, [{is_public: true}]);
    return Promise.all([
      this.collection('item')
      .find({
        company_id,
        time_start: {
          $gte: moment().startOf('day').toDate(),
          $lt: moment().endOf('day').toDate(),
        },
        status: C.ACTIVITY_STATUS.CREATED,
        $or: isMember
      }, this.baseInfo)
      .sort({time_start: -1}),
      this.collection('item')
      .find({
        company_id,
        time_start: {
          $gte: moment().add(1, 'day').startOf('day').toDate(),
          $lt: moment().add(3, 'day').startOf('day').toDate(),
        },
        status: C.ACTIVITY_STATUS.CREATED,
        $or: isMember
      }, this.baseInfo)
      .sort({time_start: -1}),
      this.collection('item')
      .find({
        company_id,
        time_start: {
          $gte: moment().startOf('day').toDate(),
          $lt: moment().endOf('day').toDate(),
        },
        status: C.ACTIVITY_STATUS.CREATED,
        $or: all,
      }, this.baseInfo)
      .sort({time_start: -1}),
      this.collection('item')
      .find({
        company_id,
        time_start: {
          $gte: moment().add(1, 'day').startOf('day').toDate(),
          $lt: moment().add(3, 'day').startOf('day').toDate(),
        },
        status: C.ACTIVITY_STATUS.CREATED,
        $or: all,
      }, this.baseInfo)
      .sort({time_start: -1}),
      this.collection('item')
      .count({
        company_id,
        time_start: { $gte: moment().startOf('day').toDate() },
        $or: isMember,
        status: C.ACTIVITY_STATUS.CREATED,
      }),
      this.collection('item')
      .count({
        company_id,
        status: C.ACTIVITY_STATUS.CREATED,
        time_start: { $gte: moment().startOf('day').toDate() },
        $or: all,
      }),
    ]).then(([now_mine, feature_mine, now_all, feature_all, mine_total, all_total]) => {
      return {
        mine: {
          now: this._listCalc(now_mine, user_id),
          feature: this._listCalc(feature_mine, user_id)
        },
        all: {
          now: this._listCalc(now_all, user_id),
          feature: this._listCalc(feature_all, user_id)
        },
        mine_total,
        all_total,
      };
    });
  }

  list({user_id, company_id, date_start, date_end, target, page}) {
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
    };
    let sortType = 1;
    if (date_start && !date_end) {
      criteria.time_start = { $gte: moment(date_start).startOf('day').toDate() };
    } else if (!date_start && date_end) {
      criteria.time_start = { $lte: moment(date_end).endOf('day').toDate() };
      sortType = -1;
    } else if (date_start && date_end) {
      criteria.time_start = { $gte: moment(date_start).startOf('day').toDate(), $lte: moment(date_end).endOf('day').toDate() };
    }
    if (target == C.LIST_TARGET.MINE) {
      criteria['$or'] = isMember;
      criteria.status = C.ACTIVITY_STATUS.CREATED;
    } else if (target == C.LIST_TARGET.ALL) {
      criteria.status = C.ACTIVITY_STATUS.CREATED;
      criteria['$or'] = all;
    } else {
      criteria.creator = user_id;
    }
    return this.collection('item')
    .find(criteria, this.baseInfo)
    .skip((page - 1) * 10)
    .limit(10)
    .sort({time_start: sortType})
    .then(list => {
      if (target == C.LIST_TARGET.CREATOR) {
        return Promise.map(list, item => {
          if (item.room.approval_id) {
            return this.collection('approval').findOne({
              _id: item.room.approval_id
            }, {
              status: 1
            })
            .then(doc => {
              item.room.approval_status = doc.status;
              return item;
            });
          } else {
            return item;
          }
        })
        .then(list => {
          return this._listCalc(list, user_id);
        });
      }
      return this._listCalc(list, user_id);
    });
  }

  month({year, month, company_id}) {
    let first_day = moment([year, month - 1]).startOf('month').toDate();
    let last_day = moment([year, month - 1]).endOf('month').toDate();
    return this.collection('item')
    .find({
      company_id,
      status: C.ACTIVITY_STATUS.CREATED,
      time_start: {
        $gte: first_day,
        $lt: last_day,
      },
    }, {
      time_start: 1,
      time_end: 1,
      departments: 1,
      name: 1,
    })
    .sort({time_start: 1})
    .then(list => {
      return list;
    });
  }

  createActivity({activity, user_id, company_id}) {
    return Promise.all([
      this.collection('room').findOne({
        _id: activity.room._id,
        company_id,
      }),
      this.collection('item').findOne({
        _id: activity.room._id,
        company_id,
        time_start: { $lte: activity.time_start },
        time_end: { $gt: activity.time_start },
      })
    ]).then(([room, exist]) => {
      if (!room) {
        throw new ApiError(400, 'invalid_room_id');
      } else if (exist && room.order_require) {
        throw new ApiError(400, 'already_exist_activity_use_room');
      }
      activity.accept_members = [];
      activity.company_id = company_id;
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
          name: room.name,
          company_id,
          manager: room.manager,
          status: C.APPROVAL_STATUS.PENDING,
          date_create: new Date(),
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
        doc.isMember = _.some([].concat(doc.creator, doc.assistants, doc.members), item => item.equals(user_id));
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
              date_create: new Date(),
            }
          }
        }).then(doc => {
          return doc;
        });
      }
    });
  }


  approvalList({company_id, user_id, page, pagesize, type, start_date, end_date}) {
    let criteria = {
      company_id,
    };
    if (type == C.APPROVAL_LIST.ALL) {
      criteria['$or'] = [
        {
          creator: user_id
        },
        {
          manager: user_id
        }
      ];
    } else if (type == C.APPROVAL_LIST.APPLY) {
      criteria.creator = user_id;
    } else if (type == C.APPROVAL_LIST.APPROVE) {
      criteria.manager = user_id;
    }
    if (start_date && end_date) {
      criteria.date_create = { $gte: start_date, $lte: end_date };
    } else if (start_date) {
      criteria.date_create = { $gte: start_date };
    } else if (end_date) {
      criteria.date_create = { $lte: end_date };
    }
    return Promise.all([
      this.collection('approval')
      .find(criteria)
      .skip((page - 1) * pagesize)
      .limit(pagesize)
      .sort({date_create: -1})
      .then(list => {
        return Promise.map(list, item => {
          return this.collection('item').findOne({
            _id: item.activity_id
          }).then(activity => {
            item.activity = activity;
            return item;
          });
        });
      }),
      this.collection('approval')
      .count(criteria),
    ]).then(([list, count]) => {
      return {
        list,
        count
      };
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
      if (!approval.creator.equals(user_id) && !approval.manager.equals(user_id)) {
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
      if (!doc.creator.equals(user_id) && !doc.manager.equals(user_id)) {
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
      if (!doc.manager.equals(user_id)) {
        throw new ApiError(400, 'unable_to_confirm');
      }
      if (doc.status != C.APPROVAL_STATUS.PENDING) {
        throw new ApiError(400, 'approval_is_already_confirm');
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
        return Promise.all([
          this.collection('item').find({
            time_start: {
              $gte: moment().startOf('day').toDate(),
              $lt: moment().startOf('day').add(1,'day').toDate()
            },
            company_id,
            'room._id': item._id,
            status: C.ACTIVITY_STATUS.CREATED,
          }),
          this.collection('item').find({
            time_start: {
              $gte: moment().startOf('day').add(1,'day').toDate(),
              $lt: moment().startOf('day').add(2,'day').toDate()
            },
            company_id,
            'room._id': item._id,
            status: C.ACTIVITY_STATUS.CREATED,
          }),
        ])
        .then(([today, tomorrow]) => {
          item.today = today;
          item.tomorrow = tomorrow;
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
          company_id,
          time_start: { $lt: moment().startOf('day').toDate() },
          status: C.ACTIVITY_STATUS.CREATED,
        })
        .sort({time_start: -1})
        .limit(C.ACTIVITY_QUERY_LIMIT),
        this.collection('item')
        .find({
          'room._id': room_id,
          company_id,
          time_start: {
            $gt: moment().startOf('day').toDate(),
            $lt: moment().startOf('day').add(1, 'day').toDate(),
          },
          status: C.ACTIVITY_STATUS.CREATED,
        })
        .sort({time_start: -1}),
        this.collection('item')
        .find({
          'room._id': room_id,
          company_id,
          time_start: {
            $gte: moment().startOf('day').add(1, 'day').toDate(),
            $lt: moment().startOf('day').add(2, 'day').toDate(),
          },
          status: C.ACTIVITY_STATUS.CREATED,
        })
        .sort({time_start: -1}),
      ]).then(([past, now, tomorrow]) => {
        room.past = past;
        room.now = now;
        room.tomorrow = tomorrow;
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
      item.total = _.uniq([].concat(item.assistants, item.creator, item.members)).length;
      item.isMember = _.some([].concat(item.assistants, item.creator, item.followers, item.members), member => member.equals(user_id));
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
