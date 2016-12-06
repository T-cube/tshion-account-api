import _ from 'underscore';
import objectPath from 'object-path';
import { ObjectId } from 'mongodb';

import db from 'lib/database';

export default class Preference {

  constructor() {}

  // @key string array object or undefined
  get(userId, key) {
    let fields = {};
    if (key) {
      if (_.isString(key)) {
        fields = {[key]: 1};
      } else if (_.isObject(key)) {
        let tempKey;
        if (!_.isArray(key)) {
          tempKey = _.keys(key);
        } else {
          tempKey = _.clone(key);
        }
        fields = _.object(tempKey.sort().reverse(), _.range(tempKey.length).map(() => 1));
      }
    }
    return db.preference.findOne({
      _id: userId
    }, fields)
    .then(doc => {
      if (key) {
        if (_.isString(key)) {
          return objectPath.get(doc, key);
        }
        if (_.isArray(key)) {
          return key.map(i => objectPath.get(doc, i));
        }
      }
      return this._flattenValues(doc);
    });
  }

  // @cover cover为false时是对现有内容的扩展
  set(userId, data, cover) {
    return db.preference.update({
      _id: userId
    }, {
      $set: cover ? data : this._flattenValues(data)
    });
  }

  init(userId, data) {
    return db.preference.update({
      _id: userId
    }, {
      $set: this._flattenValues(data)
    }, {
      upsert: true
    });
  }

  _flattenValues(doc, mom, keyPrefix) {
    mom = mom || {};
    keyPrefix = keyPrefix || [];
    _.forEach(doc, (v, k) => {
      if (_.isObject(v) && !ObjectId.isValid(v)) {
        this._flattenValues(v, mom, keyPrefix.concat(k));
      } else {
        mom[keyPrefix.concat(k).join('.')] = v;
      }
    });
    return mom;
  }

}
