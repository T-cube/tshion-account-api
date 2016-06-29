import _ from 'underscore';
import Promise from 'bluebird';
import { ObjectId } from 'mongodb';
import { time } from 'lib/utils';
import { validate } from 'lib/inspector';
import config from 'config';

import db from 'lib/database';
import { validation } from './notification.schema';
import { mapObjectIdToData } from 'lib/utils';
import C from 'lib/constants';

const extendedProps = [
  ['user', 'name', 'from,user'],
  ['company', 'name', 'company'],
  ['project', 'name,company_id', 'project'],
  ['task', 'title,company_id,project_id', 'task'],
  ['request', 'type', 'request'],
  ['schedule', 'title', 'reminding'],
  ['approval.item', 'company_id,apply_date,title', 'approval_item'],
  ['announcement', 'title,is_published,company_id,type', 'announcement'],
];

export default class Notification {
  constructor() {
    this._from = null;
    this._to = null;
  }

  from(user) {
    this._from = user;
    return this;
  }

  to(user) {
    this._to = user;
    return this;
  }

  send(data, messageType) {
    let self = this;
    data = _.extend({
      from: this._from,
      to: this._to,
    }, data);
    return isNoticeOpen(messageType).then(open => {
      if (!open) {
        return;
      }
      if (_.isArray(data.to)) {
        return self.sendToMany(data, data.to);
      } else {
        return self.sendToSingle(data, data.to);
      }
    })
    .catch(e => {
      console.error(e);
    });

    function isNoticeOpen(messageType) {
      let noticeMap = {
        [C.NOTICE.COMMON]: 'notice_request',
        [C.NOTICE.TASK_EXPIRE]: 'notice_project',
      };
      switch (messageType) {
      case C.NOTICE.COMMON:
      case C.NOTICE.TASK_EXPIRE:
        return db.user.findOne({
          _id: data.to
        }, {
          options: 1
        })
        .then(doc => {
          return (doc.options && doc.options[noticeMap[messageType]]) || true;
        });
      default:
        return Promise.resolve(true);
      }
    }
  }

  sendToSingle(data, user) {
    if (user.equals(data._id)) {
      return Promise.resolve(true);
    }
    data = _.extend({}, data, {
      to: user,
      is_read: false,
      date_create: time(),
    });
    validate(validation, data);
    let extended = _.clone(data);
    mapObjectIdToData(extended, extendedProps)
    .then(d => this.model('socket').send(user, d) );
    return db.notification.insert(data);
  }

  sendToMany(data, list) {
    let promises = list.map(user => this.sendToSingle(data, user));
    return Promise.all(promises);
  }

  fetch(query, last_id) {
    const limit = config.get('view.listNum');
    if (last_id) {
      _.extend(query, {
        _id: {$lt: last_id},
      });
    }
    return db.notification.find(query)
    .sort({is_read: 1, _id: -1}).limit(limit)
    .then(list => {
      return mapObjectIdToData(list, extendedProps);
    });
  }

  count(query, isRead) {
    if (query instanceof ObjectId) {
      query = {
        to: query,
      };
    }
    if (!_.isUndefined(isRead)) {
      query.is_read = isRead;
    }
    return db.notification.count(query)
    .then(count => ({
      count: count,
    }));
  }

  read(userId, id) {
    let query = {
      to: userId,
      is_read: false,
    };
    if (_.isArray(id)) {
      query._id = { $in: id };
    } else if (_.isObject(id)) {
      query._id = id;
    }
    return db.notification.update(query, {
      $set: { is_read: true }
    }, {
      multi: true,
    });
  }
}
