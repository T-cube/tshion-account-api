import _ from 'underscore';

import C from 'lib/constants';
import db from 'lib/database';
import { validate } from './account-log.schema.js';


export default class AccountLog {

  constructor() {}

  create(data) {
    validate('account_log', data);
    let {
      user,
      type,
      client,
      ip,
    } = data;
    return db.account.log.insert({
      user,
      type,
      client,
      ip,
      time: new Date()
    });
  }

  get(userId, options) {
    let { page, pagesize } = options;
    return db.account.log.find({
      user: userId
    })
    .limit(pagesize)
    .skip((page - 1) * pagesize);
  }

  getActiveClients(userId) {
    if (!userId) {
      return [];
    }
    let sockets = this.model('socket').getClient(userId).sockets.values();
    let activeClients = [];
    for (let v of sockets) {
      activeClients.push({
        id: v.id,
        remoteAddress: v.conn.remoteAddress,
        clientType: this.getClientTypeOfRequest({
          origin: v.request.headers.origin,
          userAgent: v.request.headers['user-agent']
        })
      });
    }
    return activeClients;
  }

  getClientTypeOfRequest(request) {
    let { origin, userAgent } = request;
    let isMobile = /https?\:\/\/m\./.test(origin);
    if (!isMobile) {
      return C.ACCOUNT_CLIENT.WEB;
    }
    if (!/wechat/i.test(userAgent)) {
      return C.ACCOUNT_CLIENT.MOBILE;
    }
    return C.ACCOUNT_CLIENT.WECHAT;
  }

}
