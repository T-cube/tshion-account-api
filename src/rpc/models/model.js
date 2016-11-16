import config from 'config';
import db from 'lib/database';

export default class Model {

  constructor() {
    this.db = db;
    this.config = config;
  }

  getPageInfo(query) {
    let { page, pagesize } = query;
    page = page >= 0 ? parseInt(page) : 0;
    pagesize = parseInt((pagesize <= config.get('view.maxListNum') && pagesize > 0)
      ? pagesize
      : config.get('view.listNum'));
    return {page, pagesize};
  }

}
