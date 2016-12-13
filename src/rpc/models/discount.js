import _ from 'underscore';
import { ObjectId } from 'mongodb';

import { mapObjectIdToData } from 'lib/utils';
import Model from './model';

export default class DiscountModel extends Model {

  constructor(props) {
    super(props);
  }

  fetchList(props) {
    let { page, pagesize, criteria } = props;
    return this.db.payment.discount.find(criteria)
    .skip(page * pagesize)
    .limit(pagesize);
  }

  count(criteria) {
    return this.db.payment.discount.count(criteria);
  }

  fetchDetail(_id) {
    return this.db.payment.discount.findOne({_id});
  }

  create(data) {
    data.date_create = data.date_update = new Date();
    return this.db.payment.discount.insert(data);
  }

  update(_id, data) {
    data.date_update = new Date();
    return this.db.payment.discount.update({_id}, {
      $set: data
    });
  }

  delete(_id) {
    return this.db.payment.discount.remove({_id});
  }

}
