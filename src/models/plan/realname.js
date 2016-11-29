
import db from 'lib/database';

export default class Realname {

  constructor(user_id) {
    this.user_id = user_id;
  }

  create(data) {
    return db.user.realname.update({
      _id: this.user_id
    }, {
      $set: data
    }, {
      upsert: true
    })
    .then(() => this.user_id);
  }

  get() {
    return db.user.realname.findOne({
      _id: this.user_id,
    });
  }

  getAuthed() {
    return db.user.realname.findOne({
      _id: this.user_id,
      status: 'accepted'
    });
  }

}
