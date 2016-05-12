import _ from 'underscore';
import Promise from 'bluebird';
import { ObjectId } from 'mongodb';
import { time } from 'lib/utils';
import { sanitizeValidateObject } from 'lib/inspector';
import { sanitization, validation } from './message.schema';

export default class Message {
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
    console.log('Message.send()');
    let _data = _.extend({
      from: this._from,
      to: this._to,
    }, data);
    if (_.isArray(_data.to)) {
      return this.sendToMany(_data, _data.to);
    } else {
      return this.sendToSingle(_data, _data.to);
    }
  }

  sendToSingle(data, user) {
    if (!ObjectId.isValid(user)) {
      throw new Error('invalid message recepient!');
    }
    sanitizeValidateObject(sanitization, validation, data);
    let _data = _.extend({}, data, {
      to: user,
      is_read: false,
      date_create: time(),
    });
    console.log(_data);
    return db.message.insert(_data);
  }

  sendToMany(data, list) {
    let promises = list.map(user => this.sendToSingle(data, user));
    return Promise.all(promises);
  }
}
