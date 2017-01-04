import _ from 'underscore';
import { ObjectId } from 'mongodb';

import db from 'lib/database';
import C from 'lib/constants';
import {indexObjectId} from 'lib/utils';

export default class TempFile {

  constructor() {
    this.db = db.temp.file;
  }

  save({files, info, is_private = true, clear_prev = false}) {
    let query = Object.assign(info, {is_private});
    if (!files || !files.length) {
      return Promise.resolve([]);
    }
    files = files.map(file => _.extend({
      _id: ObjectId()
    }, _.pick(file, 'mimetype', 'url', 'filename', 'path', 'size', 'cdn_bucket')));
    let promise;
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
        $push: {files: {$each: files}}
      }, {
        upsert: true
      });
    }
    return promise.then(() => (
      this.getPreviewLink(files, is_private)
    ));
  }

  get({info, page, pagesize}) {
    return this.db.findOne(info)
    .then(doc => {
      if (!doc) {
        return [];
      }
      return this.getPreviewLink(doc.files, doc.is_private);
    });
  }

  pop(info, fileIds) {
    return this.db.findAndModify({
      query: info,
      update: {$pull: {files: {_id: {$in: fileIds}}}},
    })
    .then(doc => {
      let files = doc.value && doc.value.files;
      files = files ? files.filter(file => indexObjectId(fileIds, file._id) > -1) : [];
      return files;
    });
  }

  getPreviewLink(files, is_private) {
    if (!is_private) {
      return Promise.resolve(files.map(file => _.pick(file, '_id', 'url')));
    }
    const qiniu = this.model('qiniu').bucket('cdn-private');
    return Promise.all(files.map(file => (
      qiniu.makeLink(file.url).then(url => _.extend(file, {url}))
    )));
  }

}
