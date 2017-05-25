import config from 'config';
import db from 'lib/database';

export default class Base {
  constructor() {

  }

  collection(dbName) {
    return db.collection(config.get('app_center.notebook.db') + dbName);
  }
}
