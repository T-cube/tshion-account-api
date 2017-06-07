import db from 'lib/database';

export default class Base {
  constructor() {

  }

  collection(dbName) {
    return db.collection('app.store.' + this.dbNamespace + '.' + dbName);
  }
}
