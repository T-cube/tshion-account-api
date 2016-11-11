import db from 'lib/database';
import Sender from './sender';

export default class WebSender extends Sender {

  constructor() {
    super();
  }

  send(type, data, extended) {
    return Promise.all([
      this.model('socket').send(data.to, extended),
      db.notification.insert(data)
    ]);
  }

}
