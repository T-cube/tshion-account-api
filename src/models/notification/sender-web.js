import db from 'lib/database';
import Sender from './sender';

export default class WebSender extends Sender {

  constructor() {
    super();
  }

  send(type, data, extended) {
    return db.notification.insert(data).then(inserted => {
      extended._id = inserted._id;
      this.model('socket').send(data.to, extended);
    });
  }

}
