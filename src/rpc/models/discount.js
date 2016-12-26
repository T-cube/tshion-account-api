import _ from 'underscore';
import { ObjectId } from 'mongodb';

import C from 'lib/constants';
import { mapObjectIdToData } from 'lib/utils';
import { ApiError } from 'lib/error';
import Model from './model';

export default class DiscountModel extends Model {

  constructor(props) {
    super(props);
  }

  fetchList(props) {
    let { page, pagesize, criteria } = props;
    return this.db.payment.discount.find(criteria)
    .skip(page * pagesize)
    .limit(pagesize)
    .sort({
      'period.date_end': 1,
      'period.date_start': 1,
    });
  }

  count(criteria) {
    return this.db.payment.discount.count(criteria);
  }

  fetchDetail(_id) {
    return this.db.payment.discount.findOne({_id});
  }

  create(data) {
    let {order_type, discount, criteria} = data;
    data.date_create = data.date_update = new Date();
    if (_.contains([C.ORDER_TYPE.NEWLY, C.ORDER_TYPE.RENEWAl], order_type) && discount.type == 'times') {
      throw new ApiError(400, 'only newly and renewal can have times discount');
    }
    data.criteria = _.pick(criteria, 'type', criteria.type);
    data.discount = _.pick(discount, 'type', discount.type);
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
