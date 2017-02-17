import _ from 'underscore';
import { ObjectId } from 'mongodb';

import { mapObjectIdToData } from 'lib/utils';
import Model from './model';

export default class RechargeModel extends Model {

  constructor(props) {
    super(props);
  }

  fetchList(props) {
    let { page, pagesize, criteria } = props;
    return this.db.payment.recharge.discount.find(criteria)
    .skip(page * pagesize)
    .limit(pagesize);
  }

  count(criteria) {
    return this.db.payment.recharge.discount.count(criteria);
  }

  fetchDetail(_id) {
    return this.db.payment.recharge.discount.findOne({_id});
  }

  create(data) {
    data.date_create = data.date_update = new Date();
    return this.db.payment.recharge.discount.insert(data);
  }

  update(_id, data) {
    data.date_update = new Date();
    return this.db.payment.recharge.discount.update({_id}, {
      $set: data
    });
  }

  delete(_id) {
    return this.db.payment.recharge.discount.remove({_id});
  }

}
