import _ from 'underscore';
import { ObjectId } from 'mongodb';

import db from 'lib/database';
import C from 'lib/constants';
import {indexObjectId} from 'lib/utils';

const qiniu = this.model('qiniu').bucket('cdn-private');

export default class TempFile {

  constructor() {
    this.db = db.temp.file;
  }

  save({files, info, is_private = true, clear_prev = false}) {
    let query = Object.assign(info, {is_private});
    if (!files || !files.length) {
      return Promise.resolve([]);
    }
    let promise;
    files.forEach(file => file._id = ObjectId());
    if (clear_prev) {
      promise = this.db.findAndModify({
        query,
        update: {$set: {files}},
        upsert: true
      })
      .then(doc => {
        let oldFiles = doc.value && doc.value.files;
        if (oldFiles && oldFiles.length) {
          // TODO unlink temp files
        }
      });
    } else {
      promise = this.db.update(query, {
        $push: {files}
      });
    }
    return promise.then(() => {
      if (!is_private) {
        return files.map(file => _.pick(file, '_id', 'url'));
      }
      return Promise.all(files.map(file => {
        return qiniu.makeLink(file.cdn_key).then(link => {
          return {
            _id: file._id,
            url: link
          };
        });
      }));
    });
  }

  pop({plan, user_id, company_id, files}) {
    let criteria;
    if (plan == C.TEAMPLAN.PRO) {
      if (user_id) {
        criteria = {user_id};
      }
    } else if (plan == C.TEAMPLAN.ENT) {
      if (company_id) {
        criteria = {company_id};
      }
    }
    if (!criteria) {
      throw new Error('invalid params');
    }
    return this._pop(criteria, files);
  }

  _pop(query, files) {
    return db.plan.auth.pic.findAndModify({
      query,
      update: {$pull: {files: {_id: {$in: files}}}},
    })
    .then(doc => {
      return doc.value ? doc.value.files.filter(file => indexObjectId(files, file._id) > -1) : [];
    });
  }

}
