import config from 'config';
import db from 'lib/database';

export default class Model {

  constructor() {
    this.db = db;
    this.config = config;
  }

  getPageInfo(query = {}) {
    let { page, pagesize } = query;
    page = page >= 0 ? parseInt(page) : 0;
    pagesize = parseInt((pagesize <= config.get('view.maxListNum') && pagesize > 0)
      ? pagesize
      : config.get('view.listNum'));
    return {page, pagesize};
  }

  page(props = {}) {
    let { criteria } = props;
    let { page, pagesize } = this.getPageInfo(props);
    return Promise.all([
      this.count(criteria),
      this.fetchList(props)
    ])
    .then(([totalRows, list]) => {
      return {
        list,
        page,
        pagesize,
        totalRows
      };
    });
  }

  count() {}
  fetchList() {}

}
