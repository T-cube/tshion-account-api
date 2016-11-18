
import db from 'lib/database';
import { validate } from './account-log.schema.js';


export default class AccountLog {

  constructor() {

  }

  create(data) {
    validate('account_log', data);
    let {
      user,
      type,
      client,
      ip,
    } = data;
    return db.account.log.insert({
      user,
      type,
      client,
      ip,
      time: new Date()
    });
  }

}
