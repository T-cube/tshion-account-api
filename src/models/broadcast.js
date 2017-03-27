import db from 'lib/database';

export default class Broadcast {
  constructor() {

  }

  list() {
    return db.broadcast.find({status: 'active'}, {_id: 1, title: 1, content: 1, link: 1})
      .limit(5)
      .sort({
        date_update: -1,
      });
  }

  detail(broadcast_id) {
    return db.broadcast.find({_id: broadcast_id});
  }
}
