import _ from 'underscore';
import Promise from 'bluebird';
import { ObjectId } from 'mongodb';
import { time } from 'lib/utils';
import { validate } from 'lib/inspector';
import config from 'config';

import C from 'lib/constants';
import db from 'lib/database';
import { validation } from './notification.schema';
import { mapObjectIdToData } from 'lib/utils';
import EmailSender from 'models/notification/sender-email';
import WebSender from 'models/notification/sender-web';
import WechatSender from 'models/notification/sender-wechat';

export const extendedProps = [
  ['user', 'name', 'from,user'],
  ['company', 'name', 'company'],
  ['project', 'name,company_id', 'project'],
  ['task', 'title,description,company_id,project_id,creator,priority', 'task'],
  ['request', 'type,object', 'request'],
  ['schedule', 'title,remind,description,time_start', 'schedule'],
  ['approval.item', 'company_id,apply_date,title,content,status', 'approval_item'],
  ['announcement', 'title,is_published,company_id,type', 'announcement'],
  ['discussion', 'title,content,creator', 'discussion']
];



export default class Notification {

  constructor() {
    this._from = null;
    this._to = null;
  }

  init() {
    let emailSender = new EmailSender();
    let webSender = new WebSender();
    let wechatSender = new WechatSender();
    this.bindLoader(emailSender);
    this.bindLoader(webSender);
    this.bindLoader(wechatSender);
    this.senders = {
      email: emailSender,
      web: webSender,
      wechat: wechatSender,
    };
  }

  from(user) {
    this._from = user;
    return this;
  }

  to(user) {
    this._to = user;
    return this;
  }

  send(data, type) {
    let self = this;
    data = _.extend({
      from: this._from,
      to: this._to,
    }, data);
    if (_.isArray(data.to)) {
      return self.sendToMany(data.to, type, data);
    } else {
      return self.sendToSingle(data.to, type, data);
    }
  }

  sendToSingle(user, type, data) {
    return this.model('notification-setting').get(user, type)
    .then(setting => {
      data = _.extend({}, data, {
        to: user,
        is_read: false,
        date_create: time(),
      });
      // validate(validation, data);
      let extended = _.clone(data);
      return mapObjectIdToData(extended, extendedProps)
      .then(d => Promise.all(_.map(this.senders, (sender, method) => {
        setting[method] && sender.send(type, data, d);
      })));
    });
  }

  sendToMany(list, type, data) {
    let promises = list.map(user => this.sendToSingle(user, type, data));
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
    .sort({_id: -1}).limit(limit)
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
