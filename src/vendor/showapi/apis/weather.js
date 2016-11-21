import _ from 'underscore';
import Promise from 'bluebird';
import sqlite from 'sqlite';

const DB_FILE = './weather-areas.db';
const QUERY_LIMIT = 10;
const SEARCH_FIELDS = 'province,province_py,district,distric_py,name,name_py';
const SELECTED_FIELDS = 'areaid,province,district,name';

export default class Weather {

  constructor(options) {
    this.serverUrl = options.serverUrl;
  }

  init() {
    sqlite.open(DB_FILE, { mode: sqlite.OPEN_READONLY, Promise })
    .then(db => {
      console.log('showapi: area database connected!');
      this.db = db;
    })
    .catch(err => {
      console.error('showapi: area database connection error!');
      throw err;
    });
  }

  getArea(areaId) {
    let sql = `SELECT ${SELECTED_FIELDS} FROM area WHERE areaid = ?`;
    return this.db.get(sql, areaId);
  }

  queryArea(keyword) {
    keyword = keyword.replace(/'/g, '\'\'').replace(/[%_]/g, '');
    let conditions = [];
    _.each(SEARCH_FIELDS.split(','), field => {
      conditions.push(`${field} LIKE '${keyword}%'`);
    });
    let sql = `SELECT ${SELECTED_FIELDS} FROM area WHERE (${conditions.join(' OR ')}) LIMIT ${QUERY_LIMIT}`;
    return this.db.all(sql);
  }

  getAreaNameList(province, district) {
    let query;
    if (!province) {
      query = this.db.get('SELECT DISTINCT province AS item FROM area');
    } else if (!district) {
      query = this.db.get('SELECT DISTINCT district AS item FROM area WHERE province = ?', province);
    } else {
      query = this.db.get('SELECT DISTINCT district AS item FROM area WHERE province = ? AND district = ?', province, district);
    }
    return query.then(list => _.pluck(list, 'item'));
  }


}
