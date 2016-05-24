import _ from 'underscore';
import Promise from 'bluebird';
import { ObjectId } from 'mongodb';
import { time } from 'lib/utils';
import { validate } from 'lib/inspector';
import config from 'config';

import { validation } from './notification.schema';
import { fetchUserInfo, mapObjectIdToData } from 'lib/utils';

const extendedProps = [
  ['user', 'name', 'from,user'],
  ['company', 'name', 'company'],
  ['project', 'name,company_id', 'project'],
  ['task', 'title,company_id,project_id', 'task'],
  ['request', 'type', 'request'],
  ['reminding', 'title,description', 'reminding'],
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

  send(data) {
    data = _.extend({
      from: this._from,
      to: this._to,
    }, data);
    if (_.isArray(data.to)) {
      return this.sendToMany(data, data.to);
    } else {
      return this.sendToSingle(data, data.to);
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
      })
    }
    return db.notification.find(query).sort({is_read: 1, _id: -1}).limit(limit)
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
      query.is_read: isRead;
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
