import _ from 'underscore';
import { ObjectId } from 'mongodb';

import { mapObjectIdToData } from 'lib/utils';
import Model from './model';

export default class PlanCompanyModel extends Model {

  constructor(props) {
    super(props);
  }

  fetchList(props) {
    let { page, pagesize, criteria } = props;
    return this.db.plan.company.find(criteria)
    .skip(page * pagesize)
    .limit(pagesize)
    .sort({
      _id: -1
    });
  }

  count(criteria) {
    return this.db.plan.company.count(criteria);
  }

  fetchDetail(_id) {
    return this.db.plan.company.findOne({_id});
  }

}
