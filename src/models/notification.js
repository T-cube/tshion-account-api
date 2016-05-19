import _ from 'underscore';
import Promise from 'bluebird';
import { ObjectId } from 'mongodb';
import { time } from 'lib/utils';
import { validate } from 'lib/inspector';
import { validation } from './notification.schema';

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
    data = _.extend({}, data, {
      to: user,
      is_read: false,
      date_create: time(),
    });
    validate(validation, data);
    return db.notification.insert(data);
  }

  sendToMany(data, list) {
    let promises = list.map(user => this.sendToSingle(data, user));
    return Promise.all(promises);
  }

  fetch(userId, last_id) {
    const limit = config.get('view.listNum');
    let query = {
      to: userId,
    };
    if (last_id) {
      _.extend(query, {
        _id: {$lt: last_id},
      })
    }
    return db.activity.find(query).sort({_id: -1}).limit(limit)
    .then(list => {
      return mapObjectIdToData(list, [
        ['project', 'name', 'project'],
        ['company', 'name', 'company'],
        ['task', 'title', 'task'],
      ]);
    });
  }
}
