import C from 'lib/constants';
import db from 'lib/database';

export default class PlanDegrade {

  constructor() {}

  get(company_id) {
    return db.plan.degrade.findOne({
      _id: company_id,
      // status: 'actived'
    });
  }

  clear(company_id) {
    return db.plan.degrade.remove({
      _id: company_id
    });
  }

}
