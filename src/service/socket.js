import _ from 'underscore';
import { EventEmitter } from 'events';
import { ObjectId } from 'mongodb';

import { time } from 'lib/utils';

class SocketClient {

  constructor(id, socket) {
    this.id = id;
    this.sockets = new Map;
    if (socket) {
      this.add(socket);
    }
  }

  add(socket) {
    this.sockets.set(socket.id, socket);
    let keys = [];
  }

  remove(socket) {
    if (!_.isString(socket)) {
      socket = socket.id;
    }
    this.sockets.delete(socket.id);
  }

}

class SocketServer extends EventEmitter {

  constructor(io) {
    super();
    this.initIO(io);
    this.clients = new Map();
    this.on('socket', socket => this.initSocket(socket));
  }

  initIO(io) {
    this.io = io;
    io.on('connection', socket => {
      this.initSocket(socket);
    });
  }

  initSocket(socket) {
    socket.emit('welcome', {
      msg: 'tlf notification service connected!',
    });
    socket.on('bind', data => this.bind(socket, data));
    socket.on('disconnect', () => this.disconnect(socket));
    // setInterval(() => {
    //   socket.emit('time', (new Date()).toISOString());
    // }, 10000);
  }

  bind(socket, data) {
    const clients = this.clients;
    const userId = ObjectId(data.user_id);
    db.oauth.accesstoken.findOne({
      user_id: userId,
      access_token: data.access_token,
      expires: {
        $gt: time(),
      }
    })
    .then(doc => {
      if (doc) {
        let key = userId.toHexString();
        let client;
        socket.userId = key;
        if (clients.has(key)) {
          client = clients.get(key);
        } else {
          client = new SocketClient(key);
          clients.set(key, client);
        }
        client.add(socket);
        socket.emit('sys.msg', { action: 'bind', ok: true, msg: 'user binded!' });
      } else {
        socket.emit('sys.msg', { action: 'bind', ok: false, msg: 'invalid user' });
      }
    })
  }

  getClient(object) {
    const clients = this.clients;
    let userId;
    if (object instanceof ObjectId) {
      userId = object.toHexString();
    } else if (_.isString(object) && ObjectId.isValid(object)) {
      userId = object;
    } else if (_.isObject(object)) {
      userId = object.id;
    } else {
      return null;
    }
    return clients.get(userId);
  }

  disconnect(socket) {
    let client = this.getClient(socket);
    if (client) {
      client.remove(socket);
    }
  }

  send(userId, data) {
    let client = this.getClient(userId);
    if (client) {
      client.sockets.forEach(socket => {
        socket.emit('notice', data);
      });
    }
  }
}

export default function initSocketServer(io) {
  return new SocketServer(io);
}
