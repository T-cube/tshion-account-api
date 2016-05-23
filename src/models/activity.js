import _ from 'underscore';
import Promise from 'bluebird';
import { ObjectId } from 'mongodb';
import config from 'config';

import { time } from 'lib/utils';
import C, {ENUMS} from 'lib/constants';
import { validate } from 'lib/inspector';
import { validation } from './activity.schema';
import { fetchUserInfo, mapObjectIdToData } from 'lib/utils';

export default class Activity {

  insert(data) {
    data = _.extend({}, data, {
      date_create: time(),
    });
    try {
      validate(validation, data);
    } catch(e) {
      return Promise.reject(e);
    }
    return db.activity.insert(data);
  }

  fetch(query, last_id) {
    const limit = config.get('view.listNum');
    if (last_id) {
      query = _.extend({}, query, {
        _id: {$lt: last_id},
      })
    }
    return db.activity.find(query).sort({_id: -1}).limit(limit)
    .then(list => {
      return mapObjectIdToData(list, [
        ['user', 'name', 'creator'],
        ['company', 'name', 'company'],
        ['project', 'name,company_id', 'project'],
        ['task', 'title,company_id,project_id', 'task'],
      ]);
    });
  }
}
