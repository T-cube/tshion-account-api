import C from 'lib/constants';
import _ from 'underscore';
import { mapObjectIdToData } from 'lib/utils';
import { ApiError } from 'lib/error';
import Model from './model';
import { BROADCAST } from 'models/notification-setting';
import app from 'index';

export default class BroadcastModel extends Model {

  constructor(props) {
    super(props);
  }

  create(props) {
    let { title, content, link, creator, type } = props;
    let notification = {
      action: C.ACTIVITY_ACTION.SYSTEM_REMIND,
      target_type: C.OBJECT_TYPE.ALL_USER,
      remind_content: {
        type,
        title,
        content,
        link,
      },
      from: creator,
    };
    process.nextTick(() => {
      this.db.user.find({
        activiated: true
      }, {
        _id: 1
      })
      .then(list => {
        list.forEach(item => {
          notification.to = item._id;
          process.nextTick(()=>{
            app.model('notification').send(notification, BROADCAST);
          });
        });
      });
    });
    return this.db.broadcast.insert({
      title,
      content,
      link,
      creator,
      date_start: new Date(),
      date_update: new Date(),
    });
  }

  update(props) {
    let { status, broadcast_id } = props;
    return this.db.broadcast.update({ _id: broadcast_id}, {
      $set: {
        status,
        date_update: new Date()
      }
    });
  }

  detail(props) {
    let { broadcast_id } =props;
    return this.db.broadcast.findOne({ _id: broadcast_id });
  }

  delete(props) {
    let { broadcast_id } =props;
    return this.db.broadcast.remove({ _id: broadcast_id });
  }

  fetchList(props) {
    let { page, pagesize, criteria = {} } = props;
    return this.db.broadcast.find(criteria)
    .skip(page * pagesize)
    .limit(pagesize)
    .sort({
      date_update: -1,
    })
    .then(list => {
      return list;
    });
  }

  count(criteria) {
    return this.db.broadcast.count(criteria);
  }

}
