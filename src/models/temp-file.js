import _ from 'underscore';
import fs from 'fs';
import { ObjectId } from 'mongodb';

import db from 'lib/database';
import C from 'lib/constants';
import {findObjectIdIndex} from 'lib/utils';

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
    }, _.pick(file, 'mimetype', 'url', 'filename', 'path', 'size', 'cdn_bucket', 'cdn_key')));
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
          this._deleteFiles(oldFiles);
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

  get({info, files, page, pagesize}) {
    return this.db.findOne(info)
    .then(doc => {
      if (!doc) {
        return [];
      }
      let value = doc.files;
      if (files) {
        value = value.filter(file => findObjectIdIndex(files, file._id) > -1);
      }
      return this.getPreviewLink(value, doc.is_private);
    });
  }

  pop(info, files) {
    return this.db.findAndModify({
      query: info,
      update: {$pull: {files: {_id: {$in: files}}}},
    })
    .then(doc => {
      let value = doc.value && doc.value.files;
      value = value ? value.filter(file => findObjectIdIndex(files, file._id) > -1) : [];
      return value;
    });
  }

  delete(info, files) {
    return this.pop(info, files)
    .then(files => {
      this._deleteFiles(files);
      return files;
    });
  }

  _deleteFiles(files) {
    files.forEach(item => {
      if (item.cdn_key && item.cdn_bucket) {
        this.model('qiniu').bucket(item.cdn_bucket)
        .delete(item.cdn_key).catch(e => {
          console.error('qiniu delete file error');
          console.error(e);
        });
      }
      fs.unlink(item.path, e => {
        if (e) {
          console.error('unlink file error');
          console.error(e);
        }
      });
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
