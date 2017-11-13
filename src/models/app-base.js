import db from 'lib/database';
import _ from 'underscore';
import path from 'path';
import Promise from 'bluebird';
import { ObjectId } from 'mongodb';

import Structure from 'models/structure';
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
        let slide = [];
        let cdn_keys = [];
        return Promise.all([
          Promise.map(_.keys(appInfo.icons), item => {
            return this._saveCdn(appInfo.icons[item]).then(info => {
              cdn_keys.push(info.cdn);
              return appInfo.icons[item] = info.url;
            });
          }),
          Promise.map(appInfo.slideshow, item => {
            return this._saveCdn(item).then(info => {
              cdn_keys.push(info.cdn);
              slide.push(info.url);
            });
          })
        ]).then(() => {
          appInfo.slideshow = slide;
          appInfo.cdn_keys = cdn_keys;
          appInfo = _.extend({}, appInfo, { star: 0, total_installed: 0, date_create: new Date(), date_update: new Date() });
          return db.collection('app.all')
          .insert(appInfo)
          .then(doc => {
            return db.collection('app')
            .insert(doc);
          })
          .then(doc => {
            return db.collection('app.version')
            .insert({
              appid: doc.appid,
              current: doc._id,
              versions: [doc._id]
            });
          });
        });
      } else {
        db.collection('app').findOne({
          _id: appVersion.current
        }).then(app => {
          if (app.version != this._info.version) {
            let appInfo = this._info;
            let slide = [];
            let cdn_keys = [];
            return Promise.all([
              Promise.map(_.keys(appInfo.icons), item => {
                return this._saveCdn(appInfo.icons[item]).then(info => {
                  cdn_keys.push(info.cdn);
                  return appInfo.icons[item] = info.url;
                });
              }),
              Promise.map(appInfo.slideshow, item => {
                return this._saveCdn(item).then(info => {
                  cdn_keys.push(info.cdn);
                  slide.push(info.url);
                });
              }),
              Promise.map(app.cdn_keys, item => {
                const qiniu = this.model('qiniu').bucket('cdn-public');
                return qiniu.delete(item);
              })
            ]).then(() => {
              appInfo.slideshow = slide;
              appInfo.cdn_keys = cdn_keys;
              return db.collection('app')
              .findOne({appid: appInfo.appid})
              .then(doc => {
                appInfo = _.extend({}, appInfo, { star: doc.star, total_installed: doc.total_installed, date_create: doc.date_create, date_update: new Date() });
                return db.collection('app.all')
                .insert(appInfo);
              })
              .then(doc => {
                return db.collection('app')
                .insert(doc);
              })
              .then(doc => {
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
            });
          } else {
            return;
          }
        });
      }
    });
  }

  _saveCdn(filePath) {
    const qiniu = this.model('qiniu').bucket('cdn-public');
    let key = `app/${this._info.appid}/v${this._info.version}/${filePath}`;
    let path = `${this._options.basepath}/${filePath}`;
    return qiniu.upload(key, path).then(data => {
      return {
        url: `${data.server_url}${key}`,
        cdn_key: key,
      };
    });
  }

  collection(dbName) {
    if (!_.some(this._info.storage.mongo, item => item == dbName)) {
      throw new ApiError(400, 'invalid_collection');
    }
    return db.collection('app.store.' + this._info.appid + '.' + dbName);
  }

  getStructure(structure, user_id) {
    return new Promise((resolve) => {
      let s = new Structure(structure);
      let memberDepartments = s.findMemberAdminDepartments(user_id);
      resolve(memberDepartments);
    });
  }

  uploadSave(file, user_id, company_id) {
    let fileData = _.pick(file, 'mimetype', 'url', 'path', 'relpath', 'size', 'cdn_bucket', 'cdn_key');
    _.extend(fileData, {
      name: file.originalname,
      company: company_id,
      module: {
        name: this.getId(),
      },
      author: user_id,
      date_update: new Date(),
      date_create: new Date(),
      updated_by: user_id,
    });
    return db.user.file.insert(fileData).then(doc => {
      return doc;
    });
  }

}
