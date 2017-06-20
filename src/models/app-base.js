import db from 'lib/database';
import _ from 'underscore';
import path from 'path';

import { ApiError } from 'lib/error';

export default class Base {

  constructor(options) {
    if (!options) throw Error('no options provided!');
    this._options = options;
    const manifestPath = path.normalize(`${options.basepath}/manifest`);
    this._info  = require(manifestPath);
  }

  getId() {
    return this._info.appid;
  }

  install() {
    return db.collection('app.version').findOne({
      appid: this._info.appid
    }).then(appVersion => {
      if (!appVersion) {
        let appInfo = this._info;
        appInfo.icons['16'] = this._saveCdn(appInfo.icons['16']);
        appInfo.icons['64'] = this._saveCdn(appInfo.icons['64']);
        appInfo.icons['128'] = this._saveCdn(appInfo.icons['128']);
        db.collection('app.all')
        .insert(appInfo)
        .then(doc => {
          return db.collection('app')
          .insert(doc);
        })
        .then(doc => {
          db.collection('app.version')
          .insert({
            appid: doc.appid,
            current: doc._id,
            versions: [doc._id]
          });
        });
      } else {
        db.collection('app').findOne({
          _id: appVersion.current
        }).then(app => {
          if (app.version != this._info.version) {
            let appInfo = this._info;
            appInfo.icons['16'] = this._saveCdn(appInfo.icons['16']);
            appInfo.icons['64'] = this._saveCdn(appInfo.icons['64']);
            appInfo.icons['128'] = this._saveCdn(appInfo.icons['128']);
            return db.collection('app.all')
            .insert(appInfo)
            .then(doc => {
              return db.collection('app')
              .insert(doc);
            }).then(doc => {
              return db.collection('app.version')
              .update({
                _id: appVersion._id
              }, {
                $set: { current: doc._id },
                $push: { versions: doc._id },
              });
            })
            .then(() => {
              return db.collection('app')
              .remove({
                _id: appVersion.current
              });
            });
          } else {
            return;
          }
        });
      }
    });
  }

  _saveCdn() {
    const qiniu = this.model('qiniu').bucket('cdn-file');

    return;
  }

  collection(dbName) {
    if (!_.some(this._info.storage.mongo, item => item == dbName)) {
      throw new ApiError(400, 'invalid_collection');
    }
    return db.collection('app.store.' + this._info.appid + '.' + dbName);
  }

  uploadSave(file, user_id, company_id) {
    let fileData = _.pick(file, 'mimetype', 'url', 'path', 'relpath', 'size', 'cdn_bucket', 'cdn_key');
    _.extend(fileData, {
      name: file.originalname,
      company: company_id,
      appid: this.getId(),
      author: user_id,
      date_update: new Date(),
      date_create: new Date(),
      updated_by: user_id,
    });
    return db.user.file.insert(fileData).then(doc => {
      return {
        _id: doc._id,
        name: doc.name,
        url: doc.url
      };
    });
  }

}
