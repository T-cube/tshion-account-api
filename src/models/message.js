import _ from 'underscore';
import Promise from 'bluebird';
import { ObjectId } from 'mongodb';
import { time } from 'lib/utils';

export default class Message {
  constructor() {
    this._from = null;
    this._to = null;
  }

  from(user) {
    this._from = user;
  }

  to(user) {
    this._to = user;
  }

  send(data) {
    let _data = _.extend({
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
    if (!ObjectId.isValid(user)) {
      throw new Error('invalid message recepient!');
    }
    let _data = _.extend({}, data, {
      to: user,
      date_create: time(),
    });
    return db.message.insert(_data);
  }

  sendToMany(data, list) {
    let promises = list.map(user => this.sendToSingle(data, user));
    return Promise.All(promises);
  }
}
