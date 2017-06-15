import db from 'lib/database';
import _ from 'underscore';

export default class Base {
  constructor() {

  }

  collection(dbName) {
    return db.collection('app.store.' + this.dbNamespace + '.' + dbName);
  }

  uploadSave(file, user_id) {
    let fileData = _.pick(file, 'mimetype', 'url', 'path', 'relpath', 'size', 'cdn_bucket', 'cdn_key');
    _.extend(fileData, {
      name: file.originalname,
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
