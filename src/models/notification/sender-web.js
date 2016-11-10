import db from 'lib/database';

export default class WebSender {

  send(type, data, extended) {
    return Promise.all([
      this.model('socket').send(data.to, extended),
      db.notification.insert(data)
    ]);
  }

}
