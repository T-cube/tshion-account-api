import db from 'lib/database';
import manifest from './app/notebook/manifest';

export default class Base {
  constructor() {

  }

  collection(dbName) {
    return db.collection('app.store.' + manifest.name + '.' + dbName);
  }
}
