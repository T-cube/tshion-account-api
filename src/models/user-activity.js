import _ from 'underscore';
import Promise from 'bluebird';
import config from 'config';

import C from 'lib/constants';
import db from 'lib/database';
import { getClientIp } from 'lib/utils';


export default class UserActivity {

  constructor() {}

  createFromReq(req, action) {
    let {
      user,
      body: {grant_type, client_id},
    } = req;
    if (action == C.USER_ACTIVITY.LOGIN && grant_type != 'password') {
      return Promise.resolve();
    }
    return this.create({
      user: user._id,
      action,
      client_id,
      user_agent: req.get('user-agent'),
      ip: getClientIp(req),
      time: new Date()
    });
  }

  create(info) {
    return db.user.activity.insert(info);
  }

  getLatestLoginInfo(userId) {
    return db.user.activity.find({
      user: userId,
      action: C.USER_ACTIVITY.LOGIN
    })
    .limit(config.get('view.userLoginListNum'))
    .sort({
      _id: -1
    });
  }

  get(userId, options) {
    let { page, pagesize } = options;
    return db.user.activity.find({
      user: userId
    })
    .limit(pagesize)
    .skip((page - 1) * pagesize);
  }

  getActiveClients(userId) {
    let clientCollection = this.model('socket').getClient(userId);
    if (!clientCollection) {
      return [];
    }
    let sockets = clientCollection.sockets.values();
    let activeClients = [];
    for (let socket of sockets) {
      activeClients.push({
        id: socket.id,
        ip: socket.conn.remoteAddress,
        client_id: socket.client_id,
        user_agent: socket.request.headers['user-agent']
      });
    }
    return activeClients;
  }

}
