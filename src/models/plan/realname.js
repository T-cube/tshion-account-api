import _ from 'underscore';

import db from 'lib/database';

export default class Realname {

  constructor(user_id) {
    this.user_id = user_id;
  }

  persist(data) {
    return db.user.realname.update({
      _id: this.user_id
    }, {
      $set: data
    }, {
      upsert: true
    });
  }

  get() {
    return db.user.realname.findOne({
      _id: this.user_id,
    })
    .then(doc => {
      if (!_.contains(['cancelled', 'rejected'], doc.status)) {
        return doc;
      }
      return null;
    });
  }

}
